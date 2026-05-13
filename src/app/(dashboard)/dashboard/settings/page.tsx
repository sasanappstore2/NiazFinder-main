'use client';

import { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Camera,
  MapPin,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const tabs = [
  { id: 'profile', label: 'اطلاعات پروفایل', icon: User },
  { id: 'security', label: 'امنیت', icon: Shield },
  { id: 'notifications', label: 'اعلان‌ها', icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">تنظیمات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مدیریت اطلاعات حساب و تنظیمات preferring
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        dir="rtl"
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-96">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>اطلاعات شخصی</CardTitle>
              <CardDescription>
                اطلاعات عمومی حساب خود را ویرایش کنید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <User className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Button
                    size="icon"
                    variant="outline"
                    className="absolute -bottom-1 -left-1 h-7 w-7 rounded-full"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    آواتار پروفایل
                  </p>
                  <p className="text-xs text-muted-foreground">
                    عکس پروفایل خود را تغییر دهید
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">نام</Label>
                  <Input id="firstName" placeholder="نام خود را وارد کنید" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input id="lastName" placeholder="نام خانوادگی" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">نام نمایشی</Label>
                  <Input id="displayName" placeholder="نام نمایشی در سایت" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">ایمیل</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5" />
                    شماره تلفن
                  </Label>
                  <Input
                    id="phone"
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                    className="text-left"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province" className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    استان
                  </Label>
                  <Select dir="rtl">
                    <SelectTrigger id="province">
                      <SelectValue placeholder="انتخاب استان" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tehran">تهران</SelectItem>
                      <SelectItem value="isfahan">اصفهان</SelectItem>
                      <SelectItem value="shiraz">فارس</SelectItem>
                      <SelectItem value="khorasan">خراسان رضوی</SelectItem>
                      <SelectItem value="azarbaijan">آذربایجان شرقی</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" />
                  درباره من
                </Label>
                <Textarea
                  id="bio"
                  placeholder="درباره خودتان بنویسید..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  حداکثر ۵۰۰ کاراکتر
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline">انصراف</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  ذخیره تغییرات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>تغییر رمز عبور</CardTitle>
                <CardDescription>
                  رمز عبور خود را به صورت دوره‌ای تغییر دهید
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    placeholder="رمز عبور فعلی"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">رمز عبور جدید</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="رمز عبور جدید"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تکرار رمز عبور جدید</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="تکرار رمز عبور جدید"
                  />
                </div>
                <div className="flex justify-end">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">
                    تغییر رمز عبور
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>ورود دو مرحله‌ای</CardTitle>
                <CardDescription>
                  حساب خود را با تایید دومرحله‌ای محافظت کنید
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between rounded-lg border border-border/50 p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        احراز هویت دو مرحله‌ای
                      </p>
                      <p className="text-xs text-muted-foreground">
                        کد تایید پیامکی فعال باشد
                      </p>
                    </div>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>تنظیمات اعلان‌ها</CardTitle>
              <CardDescription>
                تعیین کنید از چه رویدادهایی مطلع شوید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  title: 'پیشنهاد جدید',
                  desc: 'وقتی پیشنهاد جدیدی برای درخواست شما ثبت شود',
                },
                {
                  title: 'پیام جدید',
                  desc: 'وقتی پیام جدیدی دریافت کنید',
                },
                {
                  title: 'وضعیت پروژه',
                  desc: 'تغییرات وضعیت درخواست‌های شما',
                },
                {
                  title: 'پرداخت',
                  desc: 'اطلاعیه‌های مربوط به تراکنش‌ها و پرداخت‌ها',
                },
                {
                  title: 'اخبار و اطلاعیه‌ها',
                  desc: 'اعلان‌های عمومی و تبلیغاتی',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border/50 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              ))}

              <div className="flex justify-end pt-2">
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  ذخیره تنظیمات
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
