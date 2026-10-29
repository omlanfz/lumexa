import {
  asciiFileName,
  contentTypeFor,
  extensionOf,
  isAllowedHomeworkFile,
  looksLikeText,
  safeFileName,
  signatureProblem,
  viewKindFor,
} from './homework-file-types';

const bytes = (...b: number[]) => Uint8Array.from(b);
const ascii = (s: string) => Uint8Array.from(Buffer.from(s, 'latin1'));

describe('homework file types', () => {
  it('knows every format the classes use, and refuses what is not on the list', () => {
    for (const name of [
      'a.py',
      'a.ipynb',
      'a.html',
      'a.css',
      'a.js',
      'A.JAVA',
      'g.sb3',
      'w.rbxl',
      'r.pdf',
      'p.png',
      'z.zip',
      'n.docx',
      'x.cpp',
    ]) {
      expect(isAllowedHomeworkFile(name)).toBe(true);
    }
    for (const name of [
      'virus.exe',
      'run.bat',
      'noextension',
      'a.svg',
      '.env',
      'x.php7',
      'x.html.exe',
    ]) {
      expect(isAllowedHomeworkFile(name)).toBe(false);
    }
  });

  it('extensionOf reads the real last extension, whatever the path looks like', () => {
    expect(extensionOf('main.py')).toBe('py');
    expect(extensionOf('C:\\Users\\kid\\proj.SB3')).toBe('sb3');
    expect(extensionOf('archive.tar.gz')).toBe('gz');
    expect(extensionOf('README')).toBe('');
    expect(extensionOf('.hidden')).toBe('hidden');
  });

  it('decides how each file is shown', () => {
    expect(viewKindFor('a.py')).toBe('SOURCE');
    expect(viewKindFor('a.js')).toBe('SOURCE');
    expect(viewKindFor('a.java')).toBe('SOURCE');
    expect(viewKindFor('a.css')).toBe('SOURCE');
    // HTML is only ever shown as source, never run.
    expect(viewKindFor('index.html')).toBe('SOURCE');
    expect(viewKindFor('index.htm')).toBe('SOURCE');
    expect(viewKindFor('a.ipynb')).toBe('NOTEBOOK');
    expect(viewKindFor('a.pdf')).toBe('PDF');
    expect(viewKindFor('a.JPG')).toBe('IMAGE');
    expect(viewKindFor('game.sb3')).toBe('DOWNLOAD');
    expect(viewKindFor('world.rbxl')).toBe('DOWNLOAD');
    expect(viewKindFor('notes.docx')).toBe('DOWNLOAD');
    expect(viewKindFor('photo.heic')).toBe('DOWNLOAD');
    expect(viewKindFor('anything.unknown')).toBe('DOWNLOAD');
  });

  it('the stored content type comes from the extension, never from the browser', () => {
    expect(contentTypeFor('index.html')).toBe('text/plain; charset=utf-8'); // never text/html
    expect(contentTypeFor('a.py')).toBe('text/plain; charset=utf-8');
    expect(contentTypeFor('a.pdf')).toBe('application/pdf');
    expect(contentTypeFor('a.png')).toBe('image/png');
    expect(contentTypeFor('a.sb3')).toBe('application/x-scratch3');
    expect(contentTypeFor('a.rbxl')).toBe('application/octet-stream');
  });

  it('keeps names safe', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('a"b<c>.py')).toBe('a_b_c_.py');
    expect(safeFileName('   ')).toBe('file');
    expect(safeFileName('..')).toBe('file');
    expect(safeFileName('x'.repeat(400) + '.py').length).toBeLessThanOrEqual(
      150,
    );
    expect(asciiFileName('Résumé café.pdf')).toBe('R_sum_ caf_.pdf');
  });

  describe('signatureProblem — only files a browser would display are checked', () => {
    it('accepts real PDFs and images', () => {
      expect(signatureProblem('a.pdf', ascii('%PDF-1.7\n...'))).toBeNull();
      expect(
        signatureProblem(
          'a.png',
          bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
        ),
      ).toBeNull();
      expect(
        signatureProblem('a.jpg', bytes(0xff, 0xd8, 0xff, 0xe0)),
      ).toBeNull();
      expect(signatureProblem('a.gif', ascii('GIF89a'))).toBeNull();
      expect(
        signatureProblem('a.webp', ascii('RIFF\0\0\0\0WEBPVP8 ')),
      ).toBeNull();
    });
    it('refuses a file that is not what its name says', () => {
      expect(
        signatureProblem('a.pdf', ascii('<html><script>alert(1)</script>')),
      ).toMatch(/not a real \.pdf/);
      expect(signatureProblem('a.png', ascii('<svg onload=alert(1)>'))).toMatch(
        /not a real \.png/,
      );
      expect(signatureProblem('a.jpg', ascii('hello'))).toMatch(
        /not a real \.jpg/,
      );
    });
    it('leaves everything else alone (it is shown as text or downloaded)', () => {
      expect(signatureProblem('a.py', ascii('print(1)'))).toBeNull();
      expect(signatureProblem('a.sb3', ascii('not even a zip'))).toBeNull();
    });
  });

  it('looksLikeText spots binary files', () => {
    expect(looksLikeText(ascii('print("hi")\n'))).toBe(true);
    expect(looksLikeText(bytes(0x50, 0x4b, 0x03, 0x04, 0x00, 0x00))).toBe(
      false,
    );
    expect(looksLikeText(new Uint8Array())).toBe(true);
  });
});
