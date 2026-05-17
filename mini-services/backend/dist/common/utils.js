"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSlug = createSlug;
exports.generateReferralCode = generateReferralCode;
exports.daysFromNow = daysFromNow;
exports.formatPrice = formatPrice;
exports.generateOtpCode = generateOtpCode;
exports.sanitizeHtml = sanitizeHtml;
exports.truncate = truncate;
exports.calculatePaginationMeta = calculatePaginationMeta;
exports.extractClientInfo = extractClientInfo;
function createSlug(text) {
    return text
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function generateReferralCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'NF-';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}
function daysFromNow(days) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
function formatPrice(amount) {
    return new Intl.NumberFormat('fa-IR').format(amount);
}
function generateOtpCode(length = 6) {
    let code = '';
    for (let i = 0; i < length; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    return code;
}
function sanitizeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
function truncate(text, maxLength = 100) {
    if (text.length <= maxLength)
        return text;
    return text.slice(0, maxLength - 3) + '...';
}
function calculatePaginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
    };
}
function extractClientInfo(request) {
    const forwarded = request.headers['x-forwarded-for'];
    const forwardedStr = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ipAddress = forwardedStr?.split(',')[0]?.trim() || request.ip || 'unknown';
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader[0] : (userAgentHeader || 'unknown');
    return { ipAddress, userAgent };
}
//# sourceMappingURL=utils.js.map