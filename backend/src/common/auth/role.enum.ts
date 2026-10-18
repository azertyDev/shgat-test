/** Values are the X-Rol header values fixed by the task spec. */
export enum Role {
  APPLICANT = 'ariza_beruvchi',
  REVIEWER = 'tekshiruvchi',
}

export const ALL_ROLES: readonly Role[] = Object.values(Role);
