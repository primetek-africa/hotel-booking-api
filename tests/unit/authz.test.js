import { describe, it, expect } from 'vitest';
import {
  assertConversationAccess,
  assertMessageDeletableBy
} from '../../src/utils/auth/authz.js';

const conversation = { guest: 5, staff: 2 };
const conversationWithoutStaff = { guest: 5, staff: null };

// Runs a function and returns 200 if it passes, or the Boom status code if it throws
const statusOf = (fn) => {
  try {
    fn();
    return 200;
  } catch (err) {
    return err.output.statusCode;
  }
};

describe('assertConversationAccess', () => {
  it('allows the guest  participant', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        { id: 5, role: 'Guest' },
        conversation
      )
    )).toBe(200);
  });

  it('allows the assigned staff (uds compared as strings)', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        { id: 2, role: 'Staff' },
        conversation
      )
    )).toBe(200);
  });

  it('allows any Administrator', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        { id: 99, role: 'Administrator' },
        conversation
      )
    )).toBe(200);
  });

  it('forbids a non-participant', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        { id: 7, role: 'Guest' },
        conversation
      )
    )).toBe(403);
  });

  it('returns 401 without a user', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        null,
        conversation
      )
    )).toBe(401);
  });

  it('forbids a staff when the conversation has no staff yet', () => {
    expect(statusOf(() =>
      assertConversationAccess(
        { id: 2, role: 'Staff' },
        conversationWithoutStaff
      )
    )).toBe(403);
  });
});

describe('assertMessageDeletableBy', () => {
  const message = { sender: 5 };

  it('allows the sender', () => {
    expect(statusOf(() =>
      assertMessageDeletableBy(
        { id: 5, role: 'Guest' },
        message
      )
    )).toBe(200);
  });


  it('allows an Administrator', () => {
    expect(statusOf(() =>
      assertMessageDeletableBy(
        { id: 1, role: 'Administrator' },
        message
      )
    )).toBe(200);
  });

  it('forbids someone else', () => {
    expect(statusOf(() =>
      assertMessageDeletableBy(
        { id: 2, role: 'Staff' },
        message
      )
    )).toBe(403);
  });
});
