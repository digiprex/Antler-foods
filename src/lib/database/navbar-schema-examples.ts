/**
 * Database Schema Examples for Navbar Configuration
 * 
 * This file contains example database schemas for storing navbar configuration
 * in different database systems.
 */

// ============================================================================
// PRISMA SCHEMA (PostgreSQL, MySQL, SQLite, etc.)
// ============================================================================

/**
 * File: prisma/schema.prisma
 * 
 * Add these models to your Prisma schema:
 */

/*
model NavbarConfig {
  id              String      @id @default(cuid())
  
  // Logo
  logoUrl         String?
  restaurantName  String
  
  // Layout and styling
  layout          String      @default("bordered-centered")
  position        String      @default("absolute")
  zIndex          Int         @default(1000)
  
  // Colors
  bgColor         String      @default("#ffffff")
  textColor       String      @default("#000000")
  buttonBgColor   String      @default("#000000")
  buttonTextColor String      @default("#ffffff")
  borderColor     String      @default("#000000")
  borderWidth     String      @default("2px")
  
  // Additional features
  bagCount        Int         @default(0)
  additionalText  String?
  
  // Relations
  leftNavItems    NavItem[]   @relation("LeftNavItems")
  rightNavItems   NavItem[]   @relation("RightNavItems")
  ctaButton       CTAButton?
  
  // Metadata
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
  
  @@map("navbar_configs")
}

model NavItem {
  id              String        @id @default(cuid())
  label           String
  href            String
  order           Int           @default(0)
  
  // Relations
  leftNavConfigId String?
  leftNavConfig   NavbarConfig? @relation("LeftNavItems", fields: [leftNavConfigId], references: [id], onDelete: Cascade)
  
  rightNavConfigId String?
  rightNavConfig   NavbarConfig? @relation("RightNavItems", fields: [rightNavConfigId], references: [id], onDelete: Cascade)
  
  // Metadata
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@map("nav_items")
}

model CTAButton {
  id              String        @id @default(cuid())
  label           String
  href            String
  bgColor         String?
  textColor       String?
  
  // Relations
  navbarConfigId  String        @unique
  navbarConfig    NavbarConfig  @relation(fields: [navbarConfigId], references: [id], onDelete: Cascade)
  
  // Metadata
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  
  @@map("cta_buttons")
}
*/

// ============================================================================
// MONGODB SCHEMA (Mongoose)
// ============================================================================

/**
 * File: models/NavbarConfig.ts
 * 
 * MongoDB schema using Mongoose:
 */

/*
import mongoose from 'mongoose';

const NavItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  href: { type: String, required: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

const CTAButtonSchema = new mongoose.Schema({
  label: { type: String, required: true },
  href: { type: String, required: true },
  bgColor: { type: String },
  textColor: { type: String },
}, { timestamps: true });

const NavbarConfigSchema = new mongoose.Schema({
  // Logo
  logoUrl: { type: String },
  restaurantName: { type: String, required: true },
  
  // Navigation items
  leftNavItems: [NavItemSchema],
  rightNavItems: [NavItemSchema],
  
  // CTA Button
  ctaButton: { type: CTAButtonSchema, required: true },
  
  // Layout and styling
  layout: { type: String, default: 'bordered-centered' },
  position: { type: String, default: 'absolute' },
  zIndex: { type: Number, default: 1000 },
  
  // Colors
  bgColor: { type: String, default: '#ffffff' },
  textColor: { type: String, default: '#000000' },
  buttonBgColor: { type: String, default: '#000000' },
  buttonTextColor: { type: String, default: '#ffffff' },
  borderColor: { type: String, default: '#000000' },
  borderWidth: { type: String, default: '2px' },
  
  // Additional features
  bagCount: { type: Number, default: 0 },
  additionalText: { type: String },
}, { timestamps: true });

export const NavbarConfig = mongoose.models.NavbarConfig || 
  mongoose.model('NavbarConfig', NavbarConfigSchema);
*/

// ============================================================================
// SQL SCHEMA (Raw SQL)
// ============================================================================

/**
 * Raw SQL schema for PostgreSQL/MySQL:
 */

/*
-- Navbar Configuration Table
CREATE TABLE navbar_configs (
  id VARCHAR(255) PRIMARY KEY,
  logo_url VARCHAR(500),
  restaurant_name VARCHAR(255) NOT NULL,
  layout VARCHAR(50) DEFAULT 'bordered-centered',
  position VARCHAR(50) DEFAULT 'absolute',
  z_index INT DEFAULT 1000,
  bg_color VARCHAR(50) DEFAULT '#ffffff',
  text_color VARCHAR(50) DEFAULT '#000000',
  button_bg_color VARCHAR(50) DEFAULT '#000000',
  button_text_color VARCHAR(50) DEFAULT '#ffffff',
  border_color VARCHAR(50) DEFAULT '#000000',
  border_width VARCHAR(50) DEFAULT '2px',
  bag_count INT DEFAULT 0,
  additional_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Navigation Items Table
CREATE TABLE nav_items (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  href VARCHAR(500) NOT NULL,
  item_order INT DEFAULT 0,
  position_type ENUM('left', 'right') NOT NULL,
  navbar_config_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (navbar_config_id) REFERENCES navbar_configs(id) ON DELETE CASCADE
);

-- CTA Button Table
CREATE TABLE cta_buttons (
  id VARCHAR(255) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  href VARCHAR(500) NOT NULL,
  bg_color VARCHAR(50),
  text_color VARCHAR(50),
  navbar_config_id VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (navbar_config_id) REFERENCES navbar_configs(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX idx_nav_items_config ON nav_items(navbar_config_id);
CREATE INDEX idx_nav_items_order ON nav_items(item_order);
CREATE INDEX idx_cta_button_config ON cta_buttons(navbar_config_id);
*/

// ============================================================================
// SAMPLE DATA INSERTION
// ============================================================================

/**
 * Sample SQL INSERT statements:
 */

/*
-- Insert navbar configuration
INSERT INTO navbar_configs (
  id, restaurant_name, logo_url, layout, position, z_index
) VALUES (
  'navbar-1', 'Antler Foods', NULL, 'bordered-centered', 'absolute', 1000
);

-- Insert navigation items
INSERT INTO nav_items (id, label, href, item_order, position_type, navbar_config_id) VALUES
  ('nav-1', 'Menu', '/menu', 1, 'left', 'navbar-1'),
  ('nav-2', 'About', '/about', 2, 'left', 'navbar-1'),
  ('nav-3', 'Locations', '/locations', 3, 'left', 'navbar-1'),
  ('nav-4', 'Contact', '/contact', 4, 'left', 'navbar-1');

-- Insert CTA button
INSERT INTO cta_buttons (
  id, label, href, bg_color, text_color, navbar_config_id
) VALUES (
  'cta-1', 'Order Online', '/menu', '#000000', '#ffffff', 'navbar-1'
);
*/

export {};
