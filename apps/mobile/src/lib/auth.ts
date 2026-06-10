import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import { User } from './types';

export async function login(email: string, password: string): Promise<User> {
  const response = await api.post('/auth/login', { email, password });
  const { accessToken, user } = response.data;
  await AsyncStorage.setItem('token', accessToken);
  await AsyncStorage.setItem('user', JSON.stringify(user));
  return user as User;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
}

export async function getUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem('user');
  if (!raw) return null;
  return JSON.parse(raw) as User;
}
