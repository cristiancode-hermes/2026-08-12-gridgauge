import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.includes('/api/');
  const isAuth = req.url.includes('/auth/login') || req.url.includes('/auth/register');
  if (isApi && !isAuth) {
    const token = localStorage.getItem('gg_token');
    if (token) {
      return next(
        req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }),
      );
    }
  }
  return next(req);
};
