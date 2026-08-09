import { constants } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import nodemailer from 'nodemailer';
import type { WorkerConfig } from '@ltv/config';

export interface EmailMessage {
  readonly jobId: string;
  readonly messageId: string;
  readonly to: string;
  readonly from: string;
  readonly replyTo?: string;
  readonly subject: string;
  readonly text: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export class FileEmailSender implements EmailSender {
  private readonly directory: string;

  constructor(directory: string) {
    this.directory = resolve(directory);
  }

  async send(message: EmailMessage): Promise<void> {
    await mkdir(this.directory, { recursive: true });
    const path = resolve(this.directory, `${message.jobId}.json`);
    const fromDirectory = relative(this.directory, path);
    if (fromDirectory.startsWith('..') || isAbsolute(fromDirectory)) {
      throw new Error('email_file_path_invalid');
    }
    try {
      await writeFile(path, `${JSON.stringify(message, null, 2)}\n`, {
        encoding: 'utf8',
        flag: constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      });
    } catch (error) {
      // Mot job co mot ten tep: retry sau crash khong tao ban thu hai.
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly transport: ReturnType<typeof nodemailer.createTransport>;

  constructor(cfg: WorkerConfig) {
    this.transport = nodemailer.createTransport({
      host: cfg.SMTP_HOST,
      port: cfg.SMTP_PORT,
      secure: cfg.SMTP_PORT === 465,
      ...(cfg.SMTP_USER &&
        cfg.SMTP_PASSWORD && {
          auth: { user: cfg.SMTP_USER, pass: cfg.SMTP_PASSWORD },
        }),
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    await this.transport.sendMail({
      messageId: message.messageId,
      from: message.from,
      to: message.to,
      ...(message.replyTo && { replyTo: message.replyTo }),
      subject: message.subject,
      text: message.text,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
}

export function createEmailSender(cfg: WorkerConfig): EmailSender {
  return cfg.EMAIL_TRANSPORT === 'smtp'
    ? new SmtpEmailSender(cfg)
    : new FileEmailSender(cfg.EMAIL_FILE_DIR);
}
