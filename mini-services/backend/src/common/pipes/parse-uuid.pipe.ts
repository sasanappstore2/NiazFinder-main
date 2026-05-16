import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    if (!value || !uuidRegex.test(value)) {
      throw new BadRequestException(`شناسه وارد شده معتبر نیست: ${value || '(خالی)'}`);
    }

    return value;
  }
}
