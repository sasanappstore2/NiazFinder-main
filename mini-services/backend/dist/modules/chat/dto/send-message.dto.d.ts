export declare class SendMessageDto {
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'AUDIO';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
}
