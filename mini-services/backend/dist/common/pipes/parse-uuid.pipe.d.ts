import { PipeTransform } from '@nestjs/common';
export declare class ParseUuidPipe implements PipeTransform<string, string> {
    transform(value: string): string;
}
