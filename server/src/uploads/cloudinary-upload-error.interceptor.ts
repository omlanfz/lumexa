// FILE PATH: server/src/uploads/cloudinary-upload-error.interceptor.ts
//
// multer-storage-cloudinary's storage engine runs *inside* the upload
// interceptor (FileInterceptor/FilesInterceptor), before any controller
// code or fileFilter-style validation gets a say — so when Cloudinary's API
// itself rejects an upload (unsupported format, bad account config, a
// transient error, etc.) it comes back as a raw Error/plain object, not an
// HttpException. Every handler in this file is careful to throw
// BadRequestException for validation it controls (see the fileFilter
// comments above), but a Cloudinary-side rejection would otherwise slip
// past all of that and surface to the user as an opaque "unexpected error
// occurred" 500 with no actionable message. This interceptor catches
// exactly that gap and turns it into a proper 400.
import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable()
export class CloudinaryUploadErrorInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      catchError((err: unknown) => {
        if (err instanceof HttpException) return throwError(() => err);
        const message =
          err &&
          typeof err === 'object' &&
          'message' in err &&
          typeof (err as { message: unknown }).message === 'string'
            ? (err as { message: string }).message
            : 'Could not upload this file. Please try again or use a different file.';
        return throwError(() => new BadRequestException(message));
      }),
    );
  }
}
