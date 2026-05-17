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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProposalsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const proposal_entity_1 = require("../../entities/proposal.entity");
const request_entity_1 = require("../../entities/request.entity");
const user_entity_1 = require("../../entities/user.entity");
const review_entity_1 = require("../../entities/review.entity");
const notification_entity_1 = require("../../entities/notification.entity");
const redis_service_1 = require("../../common/redis/redis.service");
let ProposalsService = class ProposalsService {
    constructor(proposalRepo, requestRepo, userRepo, reviewRepo, notificationRepo, redis) {
        this.proposalRepo = proposalRepo;
        this.requestRepo = requestRepo;
        this.userRepo = userRepo;
        this.reviewRepo = reviewRepo;
        this.notificationRepo = notificationRepo;
        this.redis = redis;
    }
    async create(specialistId, dto) {
        const request = await this.requestRepo.findOne({
            where: { id: dto.requestId },
        });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        if (request.status !== request_entity_1.RequestStatus.OPEN) {
            throw new common_1.BadRequestException('این درخواست دیگر باز نیست و نمی‌توانید برای آن پیشنهاد ارسال کنید');
        }
        if (request.expiresAt && new Date() > request.expiresAt) {
            throw new common_1.BadRequestException('این درخواست منقضی شده است');
        }
        if (request.userId === specialistId) {
            throw new common_1.ForbiddenException('شما نمی‌توانید برای درخواست خود پیشنهاد ارسال کنید');
        }
        const existingProposal = await this.proposalRepo.findOne({
            where: {
                requestId: dto.requestId,
                specialistId,
                status: (0, typeorm_2.Not)((0, typeorm_2.In)([proposal_entity_1.ProposalStatus.WITHDRAWN, proposal_entity_1.ProposalStatus.REJECTED])),
            },
        });
        if (existingProposal) {
            throw new common_1.BadRequestException('شما قبلاً برای این درخواست پیشنهاد ارسال کرده‌اید');
        }
        const proposal = this.proposalRepo.create({
            coverLetter: dto.coverLetter,
            estimatedBudget: dto.estimatedBudget || 0,
            estimatedTime: dto.estimatedTime,
            deliveryUnit: (dto.deliveryUnit || 'day'),
            status: proposal_entity_1.ProposalStatus.PENDING,
            requestId: dto.requestId,
            specialistId,
        });
        await this.proposalRepo.save(proposal);
        await this.requestRepo.increment({ id: dto.requestId }, 'proposalCount', 1);
        await this.notificationRepo.save(this.notificationRepo.create({
            userId: request.userId,
            type: 'NEW_PROPOSAL',
            title: 'پیشنهاد جدید',
            body: `یک پیشنهاد جدید برای درخواست "${request.title}" دریافت شد`,
            data: {
                requestId: dto.requestId,
                proposalId: proposal.id,
                specialistId,
            },
        }));
        await this.redis.publish('proposals:created', {
            proposalId: proposal.id,
            requestId: dto.requestId,
            specialistId,
            requestOwnerId: request.userId,
        });
        const savedProposal = await this.proposalRepo.findOne({
            where: { id: proposal.id },
            relations: ['specialist'],
        });
        return savedProposal;
    }
    async findByRequest(requestId) {
        const request = await this.requestRepo.findOne({ where: { id: requestId } });
        if (!request) {
            throw new common_1.NotFoundException('درخواست مورد نظر یافت نشد');
        }
        const proposals = await this.proposalRepo.find({
            where: { requestId },
            relations: ['specialist'],
            order: { createdAt: 'DESC' },
        });
        const enrichedProposals = await Promise.all(proposals.map(async (proposal) => {
            const reviews = await this.reviewRepo.find({
                where: { targetUserId: proposal.specialistId },
                select: { rating: true },
            });
            const avgRating = reviews.length > 0
                ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
                : null;
            const projectCount = await this.proposalRepo.count({
                where: {
                    specialistId: proposal.specialistId,
                    status: proposal_entity_1.ProposalStatus.ACCEPTED,
                },
            });
            return {
                ...proposal,
                specialist: proposal.specialist
                    ? {
                        id: proposal.specialist.id,
                        firstName: proposal.specialist.firstName,
                        lastName: proposal.specialist.lastName,
                        displayName: proposal.specialist.displayName,
                        avatar: proposal.specialist.avatar,
                        bio: proposal.specialist.bio,
                        city: proposal.specialist.city,
                        province: proposal.specialist.province,
                        isVerified: proposal.specialist.isVerified,
                        avgRating,
                        totalReviews: reviews.length,
                        completedProjects: projectCount,
                    }
                    : null,
            };
        }));
        return enrichedProposals;
    }
    async findBySpecialist(specialistId) {
        const proposals = await this.proposalRepo.find({
            where: { specialistId },
            relations: ['request', 'request.category', 'request.user'],
            order: { createdAt: 'DESC' },
        });
        return proposals;
    }
    async updateStatus(id, userId, dto) {
        const proposal = await this.proposalRepo.findOne({
            where: { id },
            relations: ['request', 'request.user', 'specialist'],
        });
        if (!proposal) {
            throw new common_1.NotFoundException('پیشنهاد مورد نظر یافت نشد');
        }
        switch (dto.status) {
            case 'ACCEPTED':
                return this.acceptProposal(proposal, userId);
            case 'REJECTED':
                return this.rejectProposal(proposal, userId);
            case 'WITHDRAW':
                return this.withdrawProposal(proposal, userId);
            default:
                throw new common_1.BadRequestException('وضعیت نامعتبر است');
        }
    }
    async withdraw(proposalId, specialistId) {
        const proposal = await this.proposalRepo.findOne({
            where: { id: proposalId },
            relations: ['request'],
        });
        if (!proposal) {
            throw new common_1.NotFoundException('پیشنهاد مورد نظر یافت نشد');
        }
        return this.withdrawProposal(proposal, specialistId);
    }
    async acceptProposal(proposal, userId) {
        if (proposal.request.userId !== userId) {
            throw new common_1.ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را بپذیرد');
        }
        if (proposal.status !== proposal_entity_1.ProposalStatus.PENDING) {
            throw new common_1.BadRequestException('فقط پیشنهادهای در انتظار قابل قبول هستند');
        }
        if (proposal.request.status !== request_entity_1.RequestStatus.OPEN) {
            throw new common_1.BadRequestException('وضعیت درخواست اجازه پذیرش پیشنهاد را نمی‌دهد');
        }
        proposal.status = proposal_entity_1.ProposalStatus.ACCEPTED;
        await this.proposalRepo.save(proposal);
        const otherPending = await this.proposalRepo.find({
            where: {
                requestId: proposal.requestId,
                status: proposal_entity_1.ProposalStatus.PENDING,
                id: (0, typeorm_2.Not)(proposal.id),
            },
        });
        if (otherPending.length > 0) {
            const ids = otherPending.map((p) => p.id);
            await this.proposalRepo.update({ id: (0, typeorm_2.In)(ids) }, { status: proposal_entity_1.ProposalStatus.REJECTED });
        }
        proposal.request.status = request_entity_1.RequestStatus.IN_PROGRESS;
        proposal.request.selectedProposalId = proposal.id;
        await this.requestRepo.save(proposal.request);
        await this.notificationRepo.save(this.notificationRepo.create({
            userId: proposal.specialistId,
            type: 'PROPOSAL_ACCEPTED',
            title: 'پیشنهاد شما پذیرفته شد',
            body: `پیشنهاد شما برای درخواست "${proposal.request.title}" پذیرفته شد`,
            data: { requestId: proposal.requestId, proposalId: proposal.id },
        }));
        for (const rejected of otherPending) {
            await this.notificationRepo.save(this.notificationRepo.create({
                userId: rejected.specialistId,
                type: 'PROPOSAL_REJECTED',
                title: 'پیشنهاد شما رد شد',
                body: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
                data: { requestId: proposal.requestId },
            }));
        }
        await this.redis.publish('proposals:accepted', {
            proposalId: proposal.id,
            requestId: proposal.requestId,
            specialistId: proposal.specialistId,
            requestOwnerId: proposal.request.userId,
        });
        const saved = await this.proposalRepo.findOne({
            where: { id: proposal.id },
            relations: ['specialist'],
        });
        return saved;
    }
    async rejectProposal(proposal, userId) {
        if (proposal.request.userId !== userId) {
            throw new common_1.ForbiddenException('فقط صاحب درخواست می‌تواند پیشنهاد را رد کند');
        }
        if (proposal.status !== proposal_entity_1.ProposalStatus.PENDING) {
            throw new common_1.BadRequestException('فقط پیشنهادهای در انتظار قابل رد هستند');
        }
        proposal.status = proposal_entity_1.ProposalStatus.REJECTED;
        await this.proposalRepo.save(proposal);
        await this.notificationRepo.save(this.notificationRepo.create({
            userId: proposal.specialistId,
            type: 'PROPOSAL_REJECTED',
            title: 'پیشنهاد شما رد شد',
            body: `متأسفانه پیشنهاد شما برای درخواست "${proposal.request.title}" رد شد`,
            data: { requestId: proposal.requestId, proposalId: proposal.id },
        }));
        await this.redis.publish('proposals:rejected', {
            proposalId: proposal.id,
            requestId: proposal.requestId,
            specialistId: proposal.specialistId,
        });
        const saved = await this.proposalRepo.findOne({
            where: { id: proposal.id },
            relations: ['specialist'],
        });
        return saved;
    }
    async withdrawProposal(proposal, userId) {
        if (proposal.specialistId !== userId) {
            throw new common_1.ForbiddenException('شما فقط می‌توانید پیشنهاد خود را پس بگیرید');
        }
        if (proposal.status !== proposal_entity_1.ProposalStatus.PENDING) {
            throw new common_1.BadRequestException('فقط پیشنهادهای در انتظار قابل پس‌گرفتن هستند');
        }
        proposal.status = proposal_entity_1.ProposalStatus.WITHDRAWN;
        await this.proposalRepo.save(proposal);
        await this.requestRepo.increment({ id: proposal.requestId }, 'proposalCount', -1);
        await this.notificationRepo.save(this.notificationRepo.create({
            userId: proposal.request.userId,
            type: 'PROPOSAL_WITHDRAWN',
            title: 'یک پیشنهاد پس گرفته شد',
            body: `یک متخصص پیشنهاد خود را برای درخواست "${proposal.request.title}" پس گرفت`,
            data: { requestId: proposal.requestId, proposalId: proposal.id },
        }));
        await this.redis.publish('proposals:withdrawn', {
            proposalId: proposal.id,
            requestId: proposal.requestId,
            specialistId: proposal.specialistId,
            requestOwnerId: proposal.request.userId,
        });
        const saved = await this.proposalRepo.findOne({
            where: { id: proposal.id },
            relations: ['specialist'],
        });
        return saved;
    }
};
exports.ProposalsService = ProposalsService;
exports.ProposalsService = ProposalsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(proposal_entity_1.Proposal)),
    __param(1, (0, typeorm_1.InjectRepository)(request_entity_1.Request)),
    __param(2, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(3, (0, typeorm_1.InjectRepository)(review_entity_1.Review)),
    __param(4, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeof (_a = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _a : Object, typeof (_b = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _b : Object, typeof (_c = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _c : Object, typeof (_d = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _d : Object, typeof (_e = typeof typeorm_2.Repository !== "undefined" && typeorm_2.Repository) === "function" ? _e : Object, redis_service_1.RedisService])
], ProposalsService);
//# sourceMappingURL=proposals.service.js.map