// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  applications: {
    list: '/',
    new: '/applications/new',
    details: (id: number | string) => `/applications/${id}`,
    edit: (id: number | string) => `/applications/${id}/edit`,
  },
};
