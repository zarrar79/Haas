/**
 * @deprecated Use @/features/users/users-api — event users live at /users/ not /members/.
 */
export {
  blockEventUser as blockMember,
  createEventUser,
  deleteEventUser as removeMember,
  eventUserLabel,
  getEventUser,
  listEventUsers as listMembers,
  unblockEventUser as unblockMember,
  updateEventUser as updateMember,
  type EventUser as EventMember,
  type EventUserCreateInput,
  type EventUserTeam,
  type EventUserUpdateInput,
} from "@/features/users/users-api";
