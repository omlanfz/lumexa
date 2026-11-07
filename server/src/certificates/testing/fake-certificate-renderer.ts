// FILE PATH: server/src/certificates/testing/fake-certificate-renderer.ts
//
// A renderer that needs no Chromium, for the specs that are about the WORKFLOW
// (who may approve, what is stored, what happens on failure) rather than about
// pixels. Its "PDF" and "PNG" are tiny recognisable byte strings that embed what it
// was asked to print, so a spec can prove that exactly the confirmed details — and
// the verification URL — reached the renderer, and that the stored bytes are what
// it returned. The real renderer is exercised in certificate-renderer.integration.spec.

import type {
  CertificateRenderer,
  RenderedCertificate,
} from '../certificate-renderer.service';
import { CertificateRenderError } from '../certificate-renderer.service';
import type { CertificateTemplateInput } from '../template/certificate-template';

export class FakeCertificateRenderer implements CertificateRenderer {
  calls: CertificateTemplateInput[] = [];
  previews: CertificateTemplateInput[] = [];
  /** Makes the next render(s) fail, as if Chromium were broken. */
  failWith: CertificateRenderError | null = null;

  render(input: CertificateTemplateInput): Promise<RenderedCertificate> {
    this.calls.push(input);
    if (this.failWith) return Promise.reject(this.failWith);
    const tag = `${input.certificateId}|${input.recipientName}|${input.programName}|${input.completionDate}|${input.issueDate}|${input.verificationUrl}`;
    return Promise.resolve({
      pdf: Buffer.from(`%PDF-1.4\n% fake certificate ${tag}\n%%EOF`),
      png: Buffer.from(
        `\x89PNG\r\n\x1a\n fake certificate image ${tag}`,
        'latin1',
      ),
      pngWidth: 3369,
      pngHeight: 2382,
    });
  }

  renderPreview(input: CertificateTemplateInput): Promise<Buffer> {
    this.previews.push(input);
    if (this.failWith) return Promise.reject(this.failWith);
    return Promise.resolve(
      Buffer.from(
        `\x89PNG\r\n\x1a\n fake preview ${input.recipientName}`,
        'latin1',
      ),
    );
  }
}
