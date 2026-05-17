"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheTtl = exports.CACHE_TTL_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.CACHE_TTL_KEY = 'cache_ttl';
const CacheTtl = (seconds) => (0, common_1.SetMetadata)(exports.CACHE_TTL_KEY, seconds);
exports.CacheTtl = CacheTtl;
//# sourceMappingURL=cache-ttl.decorator.js.map