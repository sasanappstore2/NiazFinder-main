export declare enum OtpType {
    EMAIL_VERIFY = "EMAIL_VERIFY",
    PASSWORD_RESET = "PASSWORD_RESET",
    PHONE_VERIFY = "PHONE_VERIFY"
}
export declare class Otp {
    id: string;
    code: string;
    type: OtpType;
    userId: string;
    user: any;
    expiresAt: Date;
    used: boolean;
    createdAt: Date;
}
