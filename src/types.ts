/// <reference types="vite/client" />
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CarCategory = 'Hatch' | 'SUV' | 'Sedan' | 'Picape' | 'Utilitário' | 'Popular';

export interface Car {
  id: string;
  brand: string;
  model: string;
  version: string;
  price: number;
  year: string; // e.g. "2022/2023"
  km: number;
  gearbox: 'Automático' | 'Manual' | string;
  fuel: 'Flex' | 'Gasolina' | 'Álcool' | 'Diesel' | 'Híbrido' | 'Elétrico' | string;
  color: string;
  plateEnd: string;
  description: string;
  images: string[];
  features: string[];
  category: CarCategory | string;
  categoryId?: string;
  isFeatured?: boolean;
  isPromo?: boolean;
  isSold?: boolean;
  views: number;
  whatsappClicks: number;
  createdAt: string;
}

export interface LeadMessage {
  id: string;
  carId: string;
  carTitle: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
  status: 'Pendente' | 'Respondido' | 'Arquivado';
}

export interface DashboardStats {
  totalCars: number;
  mostViewed: number;
  mostSold: number;
  whatsappClicks: number;
}

export interface Quote {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  createdAt: string;
  status: 'Pendente' | 'Respondido' | 'Arquivado';
  userId?: string;
}

export interface Favorite {
  id: string;
  userId: string;
  vehicleId: string;
}

export interface Schedule {
  id: string;
  userId?: string;
  vehicleId: string;
  vehicleTitle: string;
  name: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  status: 'Pendente' | 'Confirmado' | 'Cancelado';
}

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  role: 'admin' | 'client';
  isActive?: boolean;
}



export type DamageCategory = 
  | 'Arranhão'
  | 'Amassado'
  | 'Parachoque'
  | 'Farol'
  | 'Lanterna'
  | 'Pneu'
  | 'Roda'
  | 'Retrovisor'
  | 'Capô'
  | 'Teto'
  | 'Vidro'
  | 'Outro';

export type TechnicalInspectionStatus = 'Não avaliado' | 'OK' | 'Atenção' | 'Problema';
export type InspectionCategory = 'Exterior' | 'Interior';



export interface VehicleInspectionItem {
  id: string;
  projectId: string;
  category: InspectionCategory | string;
  itemName: string;
  status: TechnicalInspectionStatus;
  notes: string;
  photos: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type InspectionStatus = 'OK' | 'Atenção' | 'Avaria' | 'Não Inspecionado';

export interface InspectionItem {
  id: string;
  vehicleId: string;
  groupName: string;
  name: string;
  description: string;
  status: InspectionStatus;
  images: string[];
  frameNumber?: number;
  posX?: number;
  posY?: number;
}




export interface Vehicle360Project {
  id: string;
  vehicleId: string;
  status: 'draft' | 'processing' | 'completed';
  frameCount: number;
  frames?: Vehicle360Frame[];
  hotspots?: Vehicle360Hotspot[];
  damageMarkers?: Vehicle360DamageMarker[];
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle360Frame {
  id: string;
  projectId: string;
  frameNumber: number;
  imageUrl: string;
  storagePath?: string;
  originalFilename?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle360MarkerPosition {
  id: string;
  frameNumber: number;
  posX: number;
  posY: number;
  visible: boolean;
  isKeyframe: boolean;
  confidence?: number;
}

export interface Vehicle360Hotspot {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  frameNumber: number;
  posX: number;
  posY: number;
  imageUrl?: string;
  storagePath?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  positions?: Vehicle360MarkerPosition[];
}

export interface Vehicle360DamageMarker {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  category: string;
  frameNumber: number;
  posX: number;
  posY: number;
  images?: Vehicle360DamageImage[];
  createdAt: string;
  updatedAt: string;
  positions?: Vehicle360MarkerPosition[];
}

export interface Vehicle360DamageImage {
  id: string;
  markerId: string;
  imageUrl: string;
  storagePath?: string;
  orderIndex: number;
  createdAt: string;
}
