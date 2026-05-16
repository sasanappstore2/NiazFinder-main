"use client";

import { useState, useEffect } from "react";
import { Menu } from "@ark-ui/react/menu";
import { Portal } from "@ark-ui/react/portal";
import {
  ChevronDown,
  User,
  LogOut,
  LayoutDashboard,
  Bookmark,
  FileText,
  CreditCard,
  Gift,
  GitCompareArrows,
  Settings,
  Bell,
  MessageSquare,
  BellOff,
  ArrowLeft,
  Phone,
  Mail,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import type { AppView } from "@/lib/types";

// ============ Shared helpers ============
function getNotificationIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("message") || lower.includes("chat")) return MessageSquare;
  if (lower.includes("like") || lower.includes("heart") || lower.includes("fav"))
    return Bell;
  if (lower.includes("star") || lower.includes("review") || lower.includes("rating"))
    return Bell;
  if (lower.includes("follow") || lower.includes("user")) return User;
  if (lower.includes("check") || lower.includes("approv") || lower.includes("verif"))
    return Bell;
  return Bell;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return "لحظاتی پیش";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} روز پیش`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ماه پیش`;
  return `${Math.floor(months / 12)} سال پیش`;
}

// ============ Menu Item Styles ============
const menuItemBase =
  "flex w-full items-center gap-3 px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors duration-150 text-right outline-hidden";
const menuItemDefault =
  "text-foreground hover:bg-accent focus:bg-accent";
const menuItemDestructive =
  "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 focus:bg-red-50 dark:focus:bg-red-950/30";

// ============ Component ============
export function ArkUserMenu() {
  const {
    isAuthenticated,
    currentUser,
    navigateTo,
    logout,
    setAuthModalOpen,
    setAuthModalTab,
    notifications,
    unreadNotificationCount,
    fetchNotifications,
    conversations,
  } = useAppStore();

  const [menuOpen, setMenuOpen] = useState(false);
  const unreadMsgCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const recentNotifications = notifications.slice(0, 3);
  const totalBadges = unreadNotificationCount + unreadMsgCount;

  const initials = currentUser
    ? currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0)
    : "";

  const handleOpenChange = (details: { open: boolean }) => {
    setMenuOpen(details.open);
    if (details.open) fetchNotifications();
  };

  const nav = (view: AppView) => {
    navigateTo(view);
  };

  const handleLogin = () => {
    setAuthModalTab("login");
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const handleRegister = () => {
    setAuthModalTab("register");
    setAuthModalOpen(true);
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Display name for trigger
  const displayName = currentUser
    ? currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`
    : "";

  return (
    <Menu.Root open={menuOpen} onOpenChange={handleOpenChange}>
      <Menu.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200",
            "border border-border/40 outline-hidden",
            menuOpen
              ? "bg-primary/10 text-primary border-primary/25 shadow-[0_0_12px_oklch(0.51_0.12_165/0.1)]"
              : "bg-background/60 text-foreground hover:bg-accent hover:border-border/60"
          )}
          aria-label="منوی کاربری"
        >
          {isAuthenticated && currentUser ? (
            <>
              <span className="relative">
                <Avatar className="size-7 border-2 border-primary/20">
                  <AvatarImage src={currentUser.avatar} />
                  <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {totalBadges > 0 && (
                  <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-notification-pulse">
                    {totalBadges > 99 ? "99+" : totalBadges}
                  </span>
                )}
              </span>
              <span className="hidden md:inline-block max-w-[100px] truncate text-sm">
                {displayName}
              </span>
            </>
          ) : (
            <>
              <span className="relative">
                <User className="size-[18px]" />
                {totalBadges > 0 && (
                  <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[8px] font-bold text-white animate-notification-pulse">
                    {totalBadges > 99 ? "99+" : totalBadges}
                  </span>
                )}
              </span>
              <span className="hidden md:inline-block">ورود / ثبت‌نام</span>
            </>
          )}
          <ChevronDown
            className={cn(
              "size-3.5 transition-transform duration-200 opacity-60",
              menuOpen && "rotate-180"
            )}
          />
        </button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner
          gutter={8}
          align="end"
          className="z-[100]"
        >
          <Menu.Content
            dir="rtl"
            className={cn(
              "min-w-[300px] max-w-[340px] rounded-xl border border-border/50 p-1.5",
              "bg-popover/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.3)]",
              "max-h-[85vh] overflow-y-auto outline-hidden",
              "focus-visible:outline-hidden"
            )}
          >
            {/* ── User Info Header ── */}
            {isAuthenticated && currentUser ? (
              <div className="mb-1.5 rounded-lg bg-muted/50 px-3 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9 border-2 border-primary/15">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-1.5 flex flex-col gap-2 rounded-lg bg-muted/50 px-3 py-3">
                <p className="text-xs text-muted-foreground text-center mb-1">
                  برای دسترسی کامل وارد شوید
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 h-8 text-xs"
                    onClick={handleLogin}
                  >
                    ورود
                  </Button>
                  <Button
                    className="flex-1 h-8 text-xs"
                    onClick={handleRegister}
                  >
                    ثبت‌نام
                  </Button>
                </div>
              </div>
            )}

            {/* ── User Navigation Items ── */}
            {isAuthenticated && (
              <>
                <Menu.Item
                  value="profile"
                  className={cn(menuItemBase, menuItemDefault)}
                  onClick={() => nav("profile")}
                >
                  <User className="size-4 text-muted-foreground" />
                  پروفایل
                </Menu.Item>
                <Menu.Item
                  value="dashboard"
                  className={cn(menuItemBase, menuItemDefault)}
                  onClick={() => nav("dashboard")}
                >
                  <LayoutDashboard className="size-4 text-muted-foreground" />
                  داشبورد
                </Menu.Item>
                <Menu.Item
                  value="bookmarks"
                  className={cn(menuItemBase, menuItemDefault)}
                  onClick={() => nav("browse-requests")}
                >
                  <Bookmark className="size-4 text-muted-foreground" />
                  علاقه‌مندی‌ها
                </Menu.Item>
                <Menu.Item
                  value="proposals"
                  className={cn(menuItemBase, menuItemDefault)}
                  onClick={() => nav("dashboard")}
                >
                  <FileText className="size-4 text-muted-foreground" />
                  پیشنهادها
                </Menu.Item>

                <Menu.Separator className="my-1 h-px bg-border/50" />
              </>
            )}

            {/* ── Notifications Section ── */}
            <div className="px-1 pt-1">
              <button
                type="button"
                onClick={() => nav("notifications")}
                className="flex w-full items-center justify-between px-3 py-1.5 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Bell className="size-4 text-muted-foreground" />
                  اعلان‌ها
                </span>
                {unreadNotificationCount > 0 && (
                  <span className="size-5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold flex items-center justify-center">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>

            {recentNotifications.length > 0 ? (
              <div className="space-y-0.5 px-1 pb-1.5">
                {recentNotifications.map((notif) => {
                  const Icon = getNotificationIcon(notif.type);
                  return (
                    <button
                      key={notif.id}
                      type="button"
                      onClick={() => nav("notifications")}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-3 py-1.5 text-right transition-colors cursor-pointer",
                        notif.isRead ? "hover:bg-accent/50" : "bg-primary/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full mt-0.5",
                          notif.isRead
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                        )}
                      >
                        <Icon className="size-3" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "truncate text-xs leading-snug",
                            notif.isRead ? "text-muted-foreground" : "font-medium"
                          )}
                        >
                          {notif.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground/50 mt-px">
                          {timeAgo(notif.createdAt)}
                        </p>
                      </div>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => nav("notifications")}
                  className="flex w-full items-center justify-center py-1 text-[10px] font-medium text-primary hover:underline cursor-pointer"
                >
                  مشاهده همه <ArrowLeft className="size-2.5 ms-1" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5 py-2.5 text-muted-foreground/30">
                <BellOff className="size-4" />
                <p className="text-[11px]">بدون اعلان جدید</p>
              </div>
            )}

            {/* ── Messages ── */}
            <Menu.Item
              value="messages"
              className={cn(menuItemBase, menuItemDefault)}
              onClick={() => nav("messages")}
            >
              <MessageSquare className="size-4 text-muted-foreground" />
              پیام‌ها
              {unreadMsgCount > 0 && (
                <span className="me-auto size-5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold flex items-center justify-center">
                  {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                </span>
              )}
            </Menu.Item>

            <Menu.Separator className="my-1 h-px bg-border/50" />

            {/* ── Quick Links ── */}
            <Menu.Item
              value="pricing"
              className={cn(menuItemBase, menuItemDefault)}
              onClick={() => nav("pricing")}
            >
              <CreditCard className="size-4 text-muted-foreground" />
              تعرفه‌ها
            </Menu.Item>
            <Menu.Item
              value="referral"
              className={cn(menuItemBase, menuItemDefault)}
              onClick={() => nav("referral")}
            >
              <Gift className="size-4 text-muted-foreground" />
              دعوت از دوستان
            </Menu.Item>
            <Menu.Item
              value="compare"
              className={cn(menuItemBase, menuItemDefault)}
              onClick={() => nav("compare-specialists")}
            >
              <GitCompareArrows className="size-4 text-muted-foreground" />
              مقایسه کسب‌وکارها
            </Menu.Item>
            <Menu.Item
              value="notification-settings"
              className={cn(menuItemBase, menuItemDefault)}
              onClick={() => nav("notification-settings")}
            >
              <Settings className="size-4 text-muted-foreground" />
              تنظیمات اعلان‌ها
            </Menu.Item>

            <Menu.Separator className="my-1 h-px bg-border/50" />

            {/* ── Theme Toggle ── */}
            <div className="px-1 py-1.5">
              <ThemeToggle />
            </div>

            <Menu.Separator className="my-1 h-px bg-border/50" />

            {/* ── Contact ── */}
            <div className="px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="size-3.5 shrink-0 text-primary/50" />
                <span dir="ltr" className="truncate">
                  support@needfinder.ir
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="size-3.5 shrink-0 text-primary/50" />
                <span dir="ltr">021-1234-5678</span>
              </div>
            </div>

            {/* ── Logout ── */}
            {isAuthenticated && (
              <>
                <Menu.Separator className="my-1 h-px bg-border/50" />
                <Menu.Item
                  value="logout"
                  className={cn(menuItemBase, menuItemDestructive)}
                  onClick={handleLogout}
                >
                  <LogOut className="size-4" />
                  خروج از حساب
                </Menu.Item>
              </>
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
