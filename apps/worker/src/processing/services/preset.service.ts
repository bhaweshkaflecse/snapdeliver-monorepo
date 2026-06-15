import { Injectable, Logger } from "@nestjs/common";
import { ExifData } from "./exif.service";

export interface SharpPresetOps {
  brightness: number;
  contrast: number;
  saturation: number;
  gamma: number;
  tint: { r: number; g: number; b: number };
}

export interface Preset {
  name: string;
  ops: SharpPresetOps;
}

/**
 * 6-preset engine for image enhancement based on shooting conditions.
 * Each preset defines specific Sharp operations to optimize image quality.
 */
@Injectable()
export class PresetService {
  private readonly logger = new Logger(PresetService.name);

  private readonly presets: Record<string, Preset> = {
    "Indoor Low Light": {
      name: "Indoor Low Light",
      ops: {
        brightness: 1.15,
        contrast: 1.1,
        saturation: 1.05,
        gamma: 1.8,
        tint: { r: 0, g: 0, b: 0 },
      },
    },
    "Outdoor Bright": {
      name: "Outdoor Bright",
      ops: {
        brightness: 0.95,
        contrast: 1.15,
        saturation: 1.1,
        gamma: 2.2,
        tint: { r: 0, g: 0, b: 0 },
      },
    },
    "Golden Hour": {
      name: "Golden Hour",
      ops: {
        brightness: 1.05,
        contrast: 1.05,
        saturation: 1.2,
        gamma: 2.0,
        tint: { r: 10, g: 5, b: -10 },
      },
    },
    "Flash Heavy": {
      name: "Flash Heavy",
      ops: {
        brightness: 0.9,
        contrast: 1.2,
        saturation: 0.95,
        gamma: 2.2,
        tint: { r: -5, g: 0, b: 5 },
      },
    },
    "Mixed Lighting": {
      name: "Mixed Lighting",
      ops: {
        brightness: 1.0,
        contrast: 1.1,
        saturation: 1.0,
        gamma: 2.0,
        tint: { r: -3, g: -3, b: 3 },
      },
    },
    "Color Neutralize": {
      name: "Color Neutralize",
      ops: {
        brightness: 1.0,
        contrast: 1.05,
        saturation: 0.85,
        gamma: 2.2,
        tint: { r: -15, g: -20, b: 10 },
      },
    },
  };

  /**
   * Returns all 6 available presets.
   */
  getAllPresets(): Preset[] {
    return Object.values(this.presets);
  }

  /**
   * Gets a preset by name.
   */
  getPreset(name: string): Preset | undefined {
    return this.presets[name];
  }

  /**
   * Selects the best preset based on EXIF data.
   * Falls back to 'Mixed Lighting' if no strong signals detected.
   */
  selectPresetFromExif(exif: ExifData): Preset {
    // Flash-dominant detection
    if (exif.flash && exif.iso && exif.iso < 800) {
      this.logger.debug("Selected preset: Flash Heavy (flash fired, low ISO)");
      return this.presets["Flash Heavy"];
    }

    // Indoor low light: high ISO, no flash or with flash
    if (exif.iso && exif.iso >= 1600) {
      this.logger.debug(
        "Selected preset: Indoor Low Light (high ISO >= 1600)"
      );
      return this.presets["Indoor Low Light"];
    }

    // Golden hour: warm white balance or low exposure time with moderate ISO
    if (
      exif.whiteBalance &&
      (exif.whiteBalance.toLowerCase().includes("cloudy") ||
        exif.whiteBalance.toLowerCase().includes("shade"))
    ) {
      this.logger.debug(
        "Selected preset: Golden Hour (warm white balance detected)"
      );
      return this.presets["Golden Hour"];
    }

    // Outdoor bright: low ISO, daylight white balance
    if (
      exif.iso &&
      exif.iso <= 400 &&
      exif.whiteBalance &&
      (exif.whiteBalance.toLowerCase().includes("daylight") ||
        exif.whiteBalance.toLowerCase().includes("auto"))
    ) {
      this.logger.debug(
        "Selected preset: Outdoor Bright (low ISO, daylight WB)"
      );
      return this.presets["Outdoor Bright"];
    }

    // Mixed lighting: tungsten or fluorescent white balance
    if (
      exif.whiteBalance &&
      (exif.whiteBalance.toLowerCase().includes("tungsten") ||
        exif.whiteBalance.toLowerCase().includes("fluorescent"))
    ) {
      this.logger.debug(
        "Selected preset: Mixed Lighting (tungsten/fluorescent WB)"
      );
      return this.presets["Mixed Lighting"];
    }

    // Flash with higher ISO (indoor party with flash)
    if (exif.flash) {
      this.logger.debug("Selected preset: Flash Heavy (flash present)");
      return this.presets["Flash Heavy"];
    }

    // Default fallback
    this.logger.debug(
      "Selected preset: Mixed Lighting (no strong EXIF signals)"
    );
    return this.presets["Mixed Lighting"];
  }

  /**
   * Gets the Color Neutralize preset specifically for color cast override.
   */
  getColorNeutralizePreset(): Preset {
    return this.presets["Color Neutralize"];
  }
}
