import { describe, it, expect } from 'vitest';
import { userSchema } from '../../src/schema/userSchema.js';
import { authenticationSchema } from '../../src/schema/authenticationSchema.js';
import { conversationSchema } from '../../src/schema/conversationSchema.js';
import { messageSchema } from '../../src/schema/messageSchema.js';

// Returns true when the payload passes the Joi schema
const valid = (schema, data) => !schema.validate(data, { abortEarly: false }).error;

const base = {
  firstName: 'Mario',
  firstLastName: 'Bros',
  email: 'mario.bros@nintendo.com',
  password: 'pass1234',
  role: '3',
  status: '1',
  phones: ['34234323453', '23443556464'],
};

describe('userSchema.newUserData', () => {

  it('accepts a valid payload', () => {
    expect(valid(
      userSchema.newUserData,
      base
    )).toBe(true);
  });

  it('accepts an empty middle name', () => {
      expect(valid(
        userSchema.newUserData,
        { ...base, middleName: '' }
      )).toBe(true);
  });

  it('rejects a password without digits', () => {
    expect(valid(
      userSchema.newUserData,
      { ...base, password: 'onlyletters' }
    )).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(valid(
      userSchema.newUserData,
      { ...base, email: 'not-an-email' }
    )).toBe(false);
  });

  it('rejects a non-numeric role id', () => {
    expect(valid(
      userSchema.newUserData,
      { ...base, role: 'Administrator' }
    )).toBe(false);
  });

  it('rejects a bad phone number', () => {
    expect(valid(
      userSchema.newUserData,
      { ...base, phones: ['number: 32123'] }
    )).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(valid(
      userSchema.newUserData,
      { email: 'a@b.com' }
    )).toBe(false);
  });
});

describe('authenticationSchema', () => {

  it('loginData accepts email + password', () => {
    expect(valid(
      authenticationSchema.loginData,
      { email: base.email, password: base.password }
    )).toBe(true);
  });

  it('loginData rejects a missing password', () => {
    expect(valid(
      authenticationSchema.loginData,
      { email: base.email }
    )).toBe(false);
  });

  it('resetPasswordData requires the three identity field' , () => {
    expect(valid(
        authenticationSchema.resetPasswordData,
        {
          email: base.email,
          firstName: base.firstName,
          firstLastName: base.firstLastName,
          newPassword: 'newPass1234'
        }
    )).toBe(true);
    expect(valid(
        authenticationSchema.resetPasswordData,
        {
          email: 'a@b.com',
          newPassword: 'newPass1234'
        }
    )).toBe(false);
  });
});

describe('messageSchema', () => {

  it('createData accepts a normal message', () => {
    expect(valid(
      messageSchema.createData,
      { conversationId: '1', body: 'Hello Seth Kojo!' }
    )).toBe(true);
  });

  it('createData rejects an empty or too-long body', () => {
    expect(valid(
      messageSchema.createData,
      { conversationId: '1', body: '' }
    )).toBe(false);
    expect(valid(
      messageSchema.createData,
      { conversationId: '1', body: 'a'.repeat(2001) }
    )).toBe(false);
  });

  it('listByConversation rejects limit above 100', () => {
    expect(valid(
      messageSchema.listByConversation,
      { conversationId: '1', limit: 101 }
    )).toBe(false);
  });

  it('listBySender allows an empty body (all fields optional', () => {
    expect(valid(
      messageSchema.listBySender,
      {}
    )).toBe(true);
  });
});

describe('conversationSchema', () => {

  it('createData needs guestId, staffId, and statusId', () => {
    expect(valid(
      conversationSchema.createData,
      { guestId: '5', staffId: '2', statusId: '1' }
    )).toBe(true);
    expect(valid(
      conversationSchema.createData,
      { guestId: '5' }
    )).toBe(false);
  });

  it('updateData makes staffId optional', () => {
    expect(valid(
      conversationSchema.updateData,
      { conversationId: '1', statusId: '2' }
    )).toBe(true);
  });
});
