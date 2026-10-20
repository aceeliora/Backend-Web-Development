const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/userRepository');

const configuredCost = Number.parseInt(process.env.BCRYPT_COST, 10);
const COST_FACTOR = Number.isInteger(configuredCost) && configuredCost >= 4 && configuredCost <= 31
  ? configuredCost
  : 12;

// A valid hash lets unknown-account failures perform bcrypt work comparable to a wrong-password failure.
const dummyPasswordHash = bcrypt.hash('non-account-dummy-password', COST_FACTOR);

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
  }
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function invalidInput(message) {
  return new AuthError(400, 'INVALID_INPUT', message);
}

function invalidCredentials() {
  return new AuthError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
}

function emailExists() {
  return new AuthError(409, 'EMAIL_EXISTS', 'An account with this email already exists');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

async function register(input) {
  const body = input && typeof input === 'object' ? input : {};
  const { name, email, password } = body;

  if (typeof name !== 'string' || name.trim().length === 0
      || typeof email !== 'string' || email.trim().length === 0
      || typeof password !== 'string' || password.length === 0) {
    throw invalidInput('Name, email, and password are required');
  }

  const normalizedEmail = normalizeEmail(email);
  const normalizedName = name.trim();
  const existingUser = await userRepository.findByEmail(normalizedEmail);
  if (existingUser) throw emailExists();

  const passwordHash = await bcrypt.hash(password, COST_FACTOR);
  try {
    const user = await userRepository.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    });
    return safeUser(user);
  } catch (error) {
    // The database unique constraint is authoritative under concurrent registrations.
    if (error && error.code === 'P2002') throw emailExists();
    throw error;
  }
}

async function login(input) {
  const body = input && typeof input === 'object' ? input : {};
  const { email, password } = body;

  if (typeof email !== 'string' || email.trim().length === 0
      || typeof password !== 'string' || password.length === 0) {
    throw invalidInput('Email and password are required');
  }

  const user = await userRepository.findByEmail(normalizeEmail(email));
  if (!user) {
    await bcrypt.compare(password, await dummyPasswordHash);
    throw invalidCredentials();
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) throw invalidCredentials();

  return safeUser(user);
}

module.exports = { AuthError, register, login };
