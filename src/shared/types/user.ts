import type { LocalUser, UserId, WorkspaceId } from './domain.js';

export interface UserState {
  users: LocalUser[];
  currentUser?: LocalUser;
}

export interface CreateLocalUserInput {
  displayName: string;
}

export interface SelectCurrentUserInput {
  userId: UserId;
  workspaceId?: WorkspaceId;
}

export interface LogoutCurrentUserInput {
  workspaceId?: WorkspaceId;
}
