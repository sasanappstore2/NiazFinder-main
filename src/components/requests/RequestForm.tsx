'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  FileText,
  DollarSign,
  MapPin,
  Tag,
  Check,
  Briefcase,
  Clock,
  AlertTriangle,
} from 'lucide-react';

import { useAppStore } from '@/lib/store';
import { CATEGORIES, CITIES, PROVINCES } from '@/lib/constants';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ============ Schema ============

const stepOneSchema = z.object({
  title: z
    .string()
    .min(1, 'عنوان الزامی است')
    .min(10, 'عنوان باید حداقل ۱۰ کاراکتر باشد'),
  categoryId: z.string().min(1, 'لطفاً دسته‌بندی را انتخاب کنید'),
  subcategoryId: z.string().optional(),
  description: z
    .string()
    .min(1, 'توضیحات الزامی است')
    .min(50, 'توضیحات باید حداقل ۵۰ کاراکتر باشد'),
});

const stepTwoSchema = z.object({
  budgetType: z.enum(['FIXED', 'HOURLY', 'NEGOTIABLE'], {
    error: 'لطفاً نوع بودجه را انتخاب کنید',
  }),
  budgetMin: z.coerce
    .number({ error: 'مقدار عددی وارد کنید' })
    .min(0, 'حداقل بودجه نمی‌تواند منفی باشد')
    .optional()
    .or(z.literal('')),
  budgetMax: z.coerce
    .number({ error: 'مقدار عددی وارد کنید' })
    .min(0, 'حداکثر بودجه نمی‌تواند منفی باشد')
    .optional()
    .or(z.literal('')),
  deliveryTime: z.coerce
    .number({ error: 'مقدار عددی وارد کنید' })
    .min(1, 'زمان تحویل باید حداقل ۱ باشد')
    .optional()
    .or(z.literal('')),
  deliveryUnit: z.string().optional(),
});

const stepThreeSchema = z.object({
  city: z.string().optional(),
  province: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'], {
    error: 'لطفاً اولویت را انتخاب کنید',
  }),
  tags: z.string().optional(),
});

const requestSchema = stepOneSchema
  .merge(stepTwoSchema)
  .merge(stepThreeSchema)
  .refine(
    (data) => {
      if (data.budgetType !== 'NEGOTIABLE') {
        const min = Number(data.budgetMin);
        const max = Number(data.budgetMax);
        if (min && max && min > max) return false;
      }
      return true;
    },
    {
      message: 'حداقل بودجه نمی‌تواند بیشتر از حداکثر باشد',
      path: ['budgetMax'],
    },
  );

type RequestFormData = z.infer<typeof requestSchema>;

// ============ Steps Config ============

const STEPS = [
  {
    id: 1,
    title: 'اطلاعات اصلی',
    description: 'عنوان، دسته‌بندی و توضیحات',
    icon: FileText,
  },
  {
    id: 2,
    title: 'بودجه و زمان',
    description: 'بودجه و زمان تحویل',
    icon: DollarSign,
  },
  {
    id: 3,
    title: 'مکان و تکمیلی',
    description: 'موقعیت و اطلاعات تکمیلی',
    icon: MapPin,
  },
];

// ============ Animation Variants ============

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: 'blur(0px)',
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    filter: 'blur(4px)',
  }),
};

const stepTransition = {
  type: 'tween' as const,
  ease: 'easeInOut' as const,
  duration: 0.3,
};

// ============ Component ============

export function RequestForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const navigateTo = useAppStore((s) => s.navigateTo);

  const form = useForm<RequestFormData>({
     
    resolver: zodResolver(requestSchema) as any,
    defaultValues: {
      title: '',
      categoryId: '',
      subcategoryId: '',
      description: '',
      budgetType: 'FIXED',
      budgetMin: '',
      budgetMax: '',
      deliveryTime: '',
      deliveryUnit: 'day',
      city: '',
      province: '',
      priority: 'NORMAL',
      tags: '',
    },
    mode: 'onChange',
  });

  const { watch, setValue, trigger, formState: { errors } } = form;

  const watchedCategoryId = watch('categoryId');
  const watchedBudgetType = watch('budgetType');
  const watchedTags = watch('tags');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
    }
  }, [isAuthenticated, setAuthModalOpen]);

  // Get subcategories based on selected category
  const subcategories = useMemo(() => {
    const category = CATEGORIES.find((c) => c.id === watchedCategoryId);
    return category?.children || [];
  }, [watchedCategoryId]);

  // Reset subcategory when category changes
  useEffect(() => {
    if (watchedCategoryId) {
      setValue('subcategoryId', '');
    }
  }, [watchedCategoryId, setValue]);

  // Parse tags for badge display
  const tagList = useMemo(() => {
    if (!watchedTags) return [];
    return watchedTags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, [watchedTags]);

  // Handle tag input changes
  const handleTagInputChange = (value: string) => {
    setTagInput(value);
    setValue('tags', value);
  };

  const removeTag = (tagToRemove: string) => {
    const updated = tagList.filter((t) => t !== tagToRemove);
    setValue('tags', updated.join('، '));
    setTagInput(updated.join('، '));
  };

  // Validate current step
  const validateStep = async (): Promise<boolean> => {
    switch (currentStep) {
      case 1: {
        const result = await trigger([
          'title',
          'categoryId',
          'description',
        ]);
        return result;
      }
      case 2: {
        const result = await trigger([
          'budgetType',
          'budgetMin',
          'budgetMax',
          'deliveryTime',
        ]);
        return result;
      }
      case 3: {
        const result = await trigger(['priority']);
        return result;
      }
      default:
        return true;
    }
  };

  const handleNext = async () => {
    const isValid = await validateStep();
    if (isValid) {
      setDirection(1);
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: RequestFormData) => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    toast.success('نیاز شما با موفقیت ثبت شد!', {
      description: 'متخصص‌ها به زودی پیشنهاد خود را ارسال می‌کنند.',
    });
    navigateTo('browse-requests');
  };

  if (!isAuthenticated) {
    return (
      <Card className="w-full max-w-2xl mx-auto border-border/50 shadow-lg">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-900/20">
            <AlertTriangle className="size-8 text-amber-500" />
          </div>
          <h3 className="text-lg font-bold mb-2">نیاز به ورود</h3>
          <p className="text-muted-foreground">
            برای ثبت نیاز جدید ابتدا وارد حساب کاربری خود شوید.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Step Progress Indicator */}
      <Card className="border-none shadow-md shadow-black/[0.03] bg-gradient-to-b from-muted/40 to-muted/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 right-6 left-6 h-0.5 bg-border hidden sm:block">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '0%' }}
                animate={{
                  width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
                }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center gap-2 z-10 flex-1 cursor-pointer"
                  onClick={() => {
                    if (step.id < currentStep) handlePrev();
                  }}
                >
                  <motion.div
                    className={`
                      size-12 rounded-full flex items-center justify-center border-2 transition-colors
                      ${isCompleted
                        ? 'bg-primary border-primary text-primary-foreground'
                        : isActive
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-background border-border text-muted-foreground'
                      }
                    `}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isCompleted ? (
                      <Check className="size-5" />
                    ) : (
                      <Icon className="size-5" />
                    )}
                  </motion.div>
                  <div className="text-center">
                    <p
                      className={`text-xs sm:text-sm font-medium ${
                        isActive || isCompleted
                          ? 'text-primary'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Form Content */}
      <Card className="border-border/50 shadow-lg shadow-black/[0.03]">
        <CardContent className="p-5 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <AnimatePresence mode="wait" custom={direction}>
                {/* ========== Step 1: Basic Info ========== */}
                {currentStep === 1 && (
                  <motion.div
                    key="step-1"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={stepTransition}
                    className="space-y-5"
                  >
                    <div className="mb-2">
                      <h3 className="text-lg font-extrabold flex items-center gap-2">
                        <Briefcase className="size-5 text-primary" />
                        اطلاعات اصلی نیاز
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        عنوان واضح و توضیحات کامل به دریافت پیشنهادهای بهتر کمک می‌کند.
                      </p>
                    </div>

                    <Separator />

                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            عنوان نیاز <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="مثال: طراحی سایت فروشگاهی آنلاین"
                              className="text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            عنوانی واضح و خلاصه که نیاز شما را نشان دهد (حداقل ۱۰ کاراکتر)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            دسته‌بندی <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            dir="rtl"
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="دسته‌بندی مورد نظر را انتخاب کنید" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-64">
                              {CATEGORIES.map((category) => (
                                <SelectItem
                                  key={category.id}
                                  value={category.id}
                                >
                                  <span className="flex items-center gap-2">
                                    <span>{category.icon}</span>
                                    <span>{category.name}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Subcategory */}
                    {subcategories.length > 0 && (
                      <FormField
                        control={form.control}
                        name="subcategoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>زیردسته‌بندی</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              dir="rtl"
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="زیردسته‌بندی را انتخاب کنید (اختیاری)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {subcategories.map((sub) => (
                                  <SelectItem key={sub.id} value={sub.id}>
                                    <span className="flex items-center gap-2">
                                      <span>{sub.icon}</span>
                                      <span>{sub.name}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            توضیحات <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="جزئیات نیاز خود را شرح دهید... (حداقل ۵۰ کاراکتر)"
                              className="min-h-[140px] resize-y text-base leading-7"
                              {...field}
                            />
                          </FormControl>
                          <div className="flex items-center justify-between">
                            <FormDescription>
                              توضیحات کامل، پیشنهادهای دقیق‌تری دریافت می‌کنید
                            </FormDescription>
                            <span
                              className={`text-xs ${
                                (field.value?.length || 0) >= 50
                                  ? 'text-green-600'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {field.value?.length || 0} / ۵۰
                            </span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {/* ========== Step 2: Budget & Timeline ========== */}
                {currentStep === 2 && (
                  <motion.div
                    key="step-2"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={stepTransition}
                    className="space-y-5"
                  >
                    <div className="mb-2">
                      <h3 className="text-lg font-extrabold flex items-center gap-2">
                        <DollarSign className="size-5 text-primary" />
                        بودجه و زمان تحویل
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        مشخص کردن بودجه و زمان تحویل به متخصص‌ها در ارسال پیشنهاد کمک می‌کند.
                      </p>
                    </div>

                    <Separator />

                    {/* Budget Type */}
                    <FormField
                      control={form.control}
                      name="budgetType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            نوع بودجه <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            dir="rtl"
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FIXED">ثابت</SelectItem>
                              <SelectItem value="HOURLY">ساعتی</SelectItem>
                              <SelectItem value="NEGOTIABLE">توافقی</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            {field.value === 'FIXED' && 'مبلغ مشخص برای کل پروژه'}
                            {field.value === 'HOURLY' && 'هزینه بر اساس ساعت کار'}
                            {field.value === 'NEGOTIABLE' && 'قیمت پس از مذاکره تعیین می‌شود'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Budget Range */}
                    {watchedBudgetType !== 'NEGOTIABLE' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Min Budget */}
                        <FormField
                          control={form.control}
                          name="budgetMin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>حداقل بودجه (تومان)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="مثلاً ۵,۰۰۰,۰۰۰"
                                  min={0}
                                  dir="ltr"
                                  className="text-left"
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Max Budget */}
                        <FormField
                          control={form.control}
                          name="budgetMax"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>حداکثر بودجه (تومان)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  placeholder="مثلاً ۱۰,۰۰۰,۰۰۰"
                                  min={0}
                                  dir="ltr"
                                  className="text-left"
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <Separator />

                    {/* Delivery Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Time Value */}
                      <FormField
                        control={form.control}
                        name="deliveryTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>زمان تحویل</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                                <Input
                                  type="number"
                                  placeholder="مثلاً ۱۴"
                                  min={1}
                                  dir="ltr"
                                  className="pr-10 text-left"
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Time Unit */}
                      <FormField
                        control={form.control}
                        name="deliveryUnit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>واحد زمان</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                              dir="rtl"
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="day">روز</SelectItem>
                                <SelectItem value="week">هفته</SelectItem>
                                <SelectItem value="month">ماه</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                )}

                {/* ========== Step 3: Location & Additional ========== */}
                {currentStep === 3 && (
                  <motion.div
                    key="step-3"
                    custom={direction}
                    variants={stepVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={stepTransition}
                    className="space-y-5"
                  >
                    <div className="mb-2">
                      <h3 className="text-lg font-extrabold flex items-center gap-2">
                        <MapPin className="size-5 text-primary" />
                        مکان و اطلاعات تکمیلی
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        اطلاعات تکمیلی به پیدا کردن متخصص مناسب‌تر کمک می‌کند.
                      </p>
                    </div>

                    <Separator />

                    {/* Province & City */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Province */}
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>استان</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              dir="rtl"
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="استان را انتخاب کنید" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {PROVINCES.map((province) => (
                                  <SelectItem key={province} value={province}>
                                    {province}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* City */}
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>شهر</FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              dir="rtl"
                            >
                              <FormControl>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="شهر را انتخاب کنید" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-64">
                                {CITIES.map((city) => (
                                  <SelectItem key={city} value={city}>
                                    {city}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Priority */}
                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            اولویت <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            dir="rtl"
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LOW">
                                <span className="flex items-center gap-2">
                                  <span className="size-2 rounded-full bg-green-500" />
                                  کم
                                </span>
                              </SelectItem>
                              <SelectItem value="NORMAL">
                                <span className="flex items-center gap-2">
                                  <span className="size-2 rounded-full bg-blue-500" />
                                  عادی
                                </span>
                              </SelectItem>
                              <SelectItem value="HIGH">
                                <span className="flex items-center gap-2">
                                  <span className="size-2 rounded-full bg-amber-500" />
                                  زیاد
                                </span>
                              </SelectItem>
                              <SelectItem value="URGENT">
                                <span className="flex items-center gap-2">
                                  <span className="size-2 rounded-full bg-red-500" />
                                  فوری
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tags */}
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            <span className="flex items-center gap-2">
                              <Tag className="size-4" />
                              تگ‌ها
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="تگ‌ها را با کاما جدا کنید (مثال: وردپرس، فروشگاهی، ریسپانسیو)"
                              value={tagInput}
                              onChange={(e) => handleTagInputChange(e.target.value)}
                            />
                          </FormControl>
                          <FormDescription>
                            تگ‌ها به پیدا شدن نیاز شما توسط متخصص‌ها کمک می‌کنند
                          </FormDescription>
                          <FormMessage />

                          {/* Tag Badges */}
                          {tagList.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {tagList.map((tag, index) => (
                                <Badge
                                  key={`${tag}-${index}`}
                                  variant="secondary"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                                  onClick={() => removeTag(tag)}
                                >
                                  {tag}
                                  <span className="size-3.5 flex items-center justify-center rounded-full bg-muted-foreground/20 text-[10px]">
                                    ×
                                  </span>
                                </Badge>
                              ))}
                            </div>
                          )}
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <Separator className="my-6" />
              <div className="flex items-center justify-between gap-3">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    className="flex items-center gap-2"
                  >
                    <ChevronRight className="size-4" />
                    مرحله قبل
                  </Button>
                ) : (
                  <div />
                )}

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2"
                  >
                    مرحله بعد
                    <ChevronLeft className="size-4" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex items-center gap-2 min-w-[140px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        در حال ثبت...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        ثبت نیاز
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
