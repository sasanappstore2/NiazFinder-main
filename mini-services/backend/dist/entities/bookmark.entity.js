"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bookmark = exports.BookmarkType = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
var BookmarkType;
(function (BookmarkType) {
    BookmarkType["REQUEST"] = "REQUEST";
    BookmarkType["SPECIALIST"] = "SPECIALIST";
})(BookmarkType || (exports.BookmarkType = BookmarkType = {}));
let Bookmark = class Bookmark extends base_entity_1.BaseEntity {
};
exports.Bookmark = Bookmark;
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: BookmarkType,
    }),
    __metadata("design:type", String)
], Bookmark.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'uuid' }),
    __metadata("design:type", String)
], Bookmark.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => require('./user.entity').User, (user) => user.bookmarks, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", Object)
], Bookmark.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Bookmark.prototype, "targetId", void 0);
exports.Bookmark = Bookmark = __decorate([
    (0, typeorm_1.Entity)('bookmarks'),
    (0, typeorm_1.Unique)('uq_bookmark_target', ['userId', 'type', 'targetId']),
    (0, typeorm_1.Index)(['userId']),
    (0, typeorm_1.Index)(['type']),
    (0, typeorm_1.Index)(['targetId'])
], Bookmark);
//# sourceMappingURL=bookmark.entity.js.map