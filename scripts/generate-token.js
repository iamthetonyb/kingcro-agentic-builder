#!/usr/bin/env node

// JWT Token Generator for KingCRO Agentic Builder
// Usage: node scripts/generate-token.js [username]

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const username = process.argv[2] || 'user';

// Generate token with 30-day expiration
const token = jwt.sign(
  {
    username: username,
    role: 'user',
    iat: Math.floor(Date.now() / 1000)
  },
  JWT_SECRET,
  { expiresIn: '30d' }
);

console.log('🔑 JWT Token Generated');
console.log('=====================');
console.log(`Username: ${username}`);
console.log(`Token: ${token}`);
console.log('');
console.log('Use this token in the web interface or API calls:');
console.log(`Authorization: Bearer ${token}`);
console.log('');
console.log('⚠️  Keep this token secure and do not share it!');
console.log('💡 Token expires in 30 days');
