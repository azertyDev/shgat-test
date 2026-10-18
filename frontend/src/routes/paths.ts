// ----------------------------------------------------------------------

export const paths = {
  root: '/',
  arizalar: {
    root: '/',
    yangi: '/arizalar/yangi',
    details: (id: number | string) => `/arizalar/${id}`,
    tahrir: (id: number | string) => `/arizalar/${id}/tahrir`,
  },
};
