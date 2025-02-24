import UserAgent from 'user-agents'
import { createHash } from 'node:crypto'

const UINT32_MAX = 2 ** 32 - 1
const WEBGL_RENDERERS = [
  'ANGLE (NVIDIA Quadro 2000M Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA Quadro K420 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA Quadro 2000M Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA Quadro K2000M Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel(R) HD Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Family Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 3800 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon R9 200 Series Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (Intel(R) HD Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Family Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Family Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics 4000 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics 3000 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Mobile Intel(R) 4 Series Express Chipset Family Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G33/G31 Express Chipset Family Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (Intel(R) Graphics Media Accelerator 3150 Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (Intel(R) G41 Express Chipset Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 6150SE nForce 430 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics 4000)',
  'ANGLE (Mobile Intel(R) 965 Express Chipset Family Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Family)',
  'ANGLE (NVIDIA GeForce GTX 760 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA GeForce GTX 760 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (NVIDIA GeForce GTX 760 Direct3D11 vs_5_0 ps_5_0)',
  'ANGLE (AMD Radeon HD 6310 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Graphics Media Accelerator 3600 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G33/G31 Express Chipset Family Direct3D9 vs_0_0 ps_2_0)',
  'ANGLE (AMD Radeon HD 6320 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G33/G31 Express Chipset Family (Microsoft Corporation - WDDM 1.0) Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (Intel(R) G41 Express Chipset)',
  'ANGLE (ATI Mobility Radeon HD 5470 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q45/Q43 Express Chipset Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 310M Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G41 Express Chipset Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (Mobile Intel(R) 45 Express Chipset Family (Microsoft Corporation - WDDM 1.1) Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 440 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 4300/4500 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7310 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics)',
  'ANGLE (Intel(R) 4 Series Internal Chipset Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon(TM) HD 6480G Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 3200 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7800 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G41 Express Chipset (Microsoft Corporation - WDDM 1.1) Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 210 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 630 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7340 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) 82945G Express Chipset Family Direct3D9 vs_0_0 ps_2_0)',
  'ANGLE (NVIDIA GeForce GT 430 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 7025 / NVIDIA nForce 630a Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q35 Express Chipset Family Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (Intel(R) HD Graphics 4600 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7520G Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD 760G (Microsoft Corporation WDDM 1.1) Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 220 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 9500 GT Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Family Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Graphics Media Accelerator HD Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 9800 GT Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q965/Q963 Express Chipset Family (Microsoft Corporation - WDDM 1.0) Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (NVIDIA GeForce GTX 550 Ti Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q965/Q963 Express Chipset Family Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (AMD M880G with ATI Mobility Radeon HD 4250 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GTX 650 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Mobility Radeon HD 5650 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 4200 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7700 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G33/G31 Express Chipset Family)',
  'ANGLE (Intel(R) 82945G Express Chipset Family Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (SiS Mirage 3 Graphics Direct3D9Ex vs_2_0 ps_2_0)',
  'ANGLE (NVIDIA GeForce GT 430)',
  'ANGLE (AMD RADEON HD 6450 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon 3000 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) 4 Series Internal Chipset Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q35 Express Chipset Family (Microsoft Corporation - WDDM 1.0) Direct3D9Ex vs_0_0 ps_2_0)',
  'ANGLE (NVIDIA GeForce GT 220 Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 7640G Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD 760G Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 6450 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 640 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 9200 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 610 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 6290 Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Mobility Radeon HD 4250 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 8600 GT Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 5570 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 6800 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) G45/G43 Express Chipset Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 4600 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA Quadro NVS 160M Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics 3000)',
  'ANGLE (NVIDIA GeForce G100)',
  'ANGLE (AMD Radeon HD 8610G + 8500M Dual Graphics Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Mobile Intel(R) 4 Series Express Chipset Family Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 7025 / NVIDIA nForce 630a (Microsoft Corporation - WDDM) Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) Q965/Q963 Express Chipset Family Direct3D9 vs_0_0 ps_2_0)',
  'ANGLE (AMD RADEON HD 6350 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (ATI Radeon HD 5450 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce 9500 GT)',
  'ANGLE (AMD Radeon HD 6500M/5600/5700 Series Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Mobile Intel(R) 965 Express Chipset Family)',
  'ANGLE (NVIDIA GeForce 8400 GS Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (Intel(R) HD Graphics Direct3D9 vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GTX 560 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 620 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GTX 660 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon(TM) HD 6520G Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA GeForce GT 240 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (AMD Radeon HD 8240 Direct3D9Ex vs_3_0 ps_3_0)',
  'ANGLE (NVIDIA Quadro NVS 140M)',
  'ANGLE (Intel(R) Q35 Express Chipset Family Direct3D9 vs_0_0 ps_2_0)',
]

export type Fingerprint = {
  WEBGL_VENDOR: string
  WEBGL_RENDERER: string
  userAgent: string
  platform: string
  deviceCategory: string
  viewportHeight: number
  viewportWidth: number
  screenWidth: string
  screenHeight: string
  BUID: string
  random: (index: number) => number
}

export function getBrowserfingerprint(
  buid,
  emulateFlag = 'desktop',
): Fingerprint {
  const generateUserAgent = new UserAgent({
    deviceCategory: emulateFlag,
  })
  const fingerprints = Array(1000)
    .fill(0)
    .map(() => generateUserAgent())

  const WEBGL_PARAMETER = {
    WEBGL_VENDOR: 'Google Inc.',
    WEBGL_RENDERER:
      WEBGL_RENDERERS[Math.floor(Math.random() * WEBGL_RENDERERS.length)],
  }

  const fingerprint = Object.assign(
    fingerprints[Math.floor(Math.random() * fingerprints.length)].data,
    WEBGL_PARAMETER,
  )

  const buidHash = createHash('sha512').update(buid).digest()
  fingerprint.BUID = buidHash.toString('base64')

  fingerprint.random = (index) => {
    const idx = index % 124
    if (idx < 62) return buidHash.readUInt32BE(idx) / UINT32_MAX
    return buidHash.readUInt32LE(idx - 62) / UINT32_MAX
  }

  return fingerprint
}
