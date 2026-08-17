import { authHandlers } from "./auth";
import { profilesHandlers } from "./profiles";
import { projectMembersHandlers } from "./projectMembers";
import { projectsHandlers } from "./projects";
import { rpcHandlers } from "./rpc";
import { storageHandlers } from "./storage";
import { tasksHandlers } from "./tasks";

export const handlers = [
  ...projectsHandlers,
  ...tasksHandlers,
  ...projectMembersHandlers,
  ...profilesHandlers,
  ...rpcHandlers,
  ...authHandlers,
  ...storageHandlers,
];
