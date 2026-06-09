'use client';

import React from 'react';
import { Bell, User } from 'lucide-react';
import { User as UserType } from '../../types';
import { LanguageSelector } from './LanguageSelector';

interface NavbarProps {
  user?: UserType | null;
  unreadAlerts?: number;
}

export function Navbar({ user, unreadAlerts = 0 }: NavbarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <LanguageSelector />

        <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
          {unreadAlerts > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadAlerts > 9 ? '9+' : unreadAlerts}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-gray-200">
          <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          {user && (
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
