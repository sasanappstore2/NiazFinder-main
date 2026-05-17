"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheAuth = exports.CACHE_AUTH_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CACHE_AUTH_KEY = 'cache_auth';
const CacheAuth = () => (0, common_1.SetMetadata)(exports.CACHE_AUTH_KEY, true);
exports.CacheAuth = CacheAuth;
//# sourceMappingURL=cache-auth.decorator.js.map