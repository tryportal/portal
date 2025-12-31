"use client"

import * as React from "react"
import {
  HashIcon,
  MegaphoneIcon,
  LightbulbIcon,
  CodeIcon,
  RocketIcon,
  ChatCircleDotsIcon,
  BookOpenIcon,
  GearIcon,
  UsersIcon,
  StarIcon,
  HeartIcon,
  BellIcon,
  CalendarIcon,
  FolderIcon,
  FileIcon,
  ImageIcon,
  VideoIcon,
  MusicNoteIcon,
  GlobeIcon,
  MapPinIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  PresentationIcon,
  BriefcaseIcon,
  GraduationCapIcon,
  TrophyIcon,
  GameControllerIcon,
  PuzzlePieceIcon,
  PaletteIcon,
  CameraIcon,
  MicrophoneIcon,
  HeadphonesIcon,
  WrenchIcon,
  HammerIcon,
  ShieldIcon,
  LockIcon,
  KeyIcon,
  LinkIcon,
  PaperclipIcon,
  EnvelopeIcon,
  ChatIcon,
  PhoneIcon,
  CloudIcon,
  SunIcon,
  MoonIcon,
  ThermometerIcon,
  LeafIcon,
  TreeIcon,
  FlowerIcon,
  BugIcon,
  SneakerIcon,
  CatIcon,
  DogIcon,
  HorseIcon,
  BirdIcon,
  FishIcon,
  AirplaneIcon,
  CarIcon,
  BicycleIcon,
  TrainIcon,
  BoatIcon,
  HouseIcon,
  BuildingsIcon,
  FactoryIcon,
  LighthouseIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  FlagIcon,
  TagIcon,
  BookmarkIcon,
  ArchiveIcon,
  TrashIcon,
  PencilIcon,
  EraserIcon,
  ScissorsIcon,
  PrinterIcon,
  FloppyDiskIcon,
  DesktopIcon,
  DeviceMobileIcon,
  WifiHighIcon,
  BluetoothIcon,
  BatteryFullIcon,
  PlugIcon,
  CpuIcon,
  DatabaseIcon,
  TerminalIcon,
  GitBranchIcon,
  GitMergeIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

// Map of icon names to components
export const iconMap: Record<string, React.ElementType> = {
  Hash: HashIcon,
  Megaphone: MegaphoneIcon,
  Lightbulb: LightbulbIcon,
  Code: CodeIcon,
  Rocket: RocketIcon,
  ChatCircleDots: ChatCircleDotsIcon,
  BookOpen: BookOpenIcon,
  Gear: GearIcon,
  Users: UsersIcon,
  Star: StarIcon,
  Heart: HeartIcon,
  Bell: BellIcon,
  Calendar: CalendarIcon,
  Folder: FolderIcon,
  File: FileIcon,
  Image: ImageIcon,
  Video: VideoIcon,
  MusicNote: MusicNoteIcon,
  Globe: GlobeIcon,
  MapPin: MapPinIcon,
  ShoppingCart: ShoppingCartIcon,
  CurrencyDollar: CurrencyDollarIcon,
  ChartBar: ChartBarIcon,
  Presentation: PresentationIcon,
  Briefcase: BriefcaseIcon,
  GraduationCap: GraduationCapIcon,
  Trophy: TrophyIcon,
  GameController: GameControllerIcon,
  PuzzlePiece: PuzzlePieceIcon,
  Palette: PaletteIcon,
  Camera: CameraIcon,
  Microphone: MicrophoneIcon,
  Headphones: HeadphonesIcon,
  Wrench: WrenchIcon,
  Hammer: HammerIcon,
  Shield: ShieldIcon,
  Lock: LockIcon,
  Key: KeyIcon,
  Link: LinkIcon,
  Paperclip: PaperclipIcon,
  Envelope: EnvelopeIcon,
  Chat: ChatIcon,
  Phone: PhoneIcon,
  Cloud: CloudIcon,
  Sun: SunIcon,
  Moon: MoonIcon,
  Thermometer: ThermometerIcon,
  Leaf: LeafIcon,
  Tree: TreeIcon,
  Flower: FlowerIcon,
  Bug: BugIcon,
  Spider: SneakerIcon,
  Cat: CatIcon,
  Dog: DogIcon,
  Horse: HorseIcon,
  Bird: BirdIcon,
  Fish: FishIcon,
  Airplane: AirplaneIcon,
  Car: CarIcon,
  Bicycle: BicycleIcon,
  Train: TrainIcon,
  Boat: BoatIcon,
  House: HouseIcon,
  Buildings: BuildingsIcon,
  Factory: FactoryIcon,
  Lighthouse: LighthouseIcon,
  MagnifyingGlass: MagnifyingGlassIcon,
  Funnel: FunnelIcon,
  Flag: FlagIcon,
  Tag: TagIcon,
  Bookmark: BookmarkIcon,
  Archive: ArchiveIcon,
  Trash: TrashIcon,
  Pencil: PencilIcon,
  Eraser: EraserIcon,
  Scissors: ScissorsIcon,
  Printer: PrinterIcon,
  FloppyDisk: FloppyDiskIcon,
  Desktop: DesktopIcon,
  DeviceMobile: DeviceMobileIcon,
  Wifi: WifiHighIcon,
  Bluetooth: BluetoothIcon,
  BatteryFull: BatteryFullIcon,
  Plug: PlugIcon,
  Cpu: CpuIcon,
  Database: DatabaseIcon,
  Terminal: TerminalIcon,
  GitBranch: GitBranchIcon,
  GitMerge: GitMergeIcon,
}

// Commonly used icons shown first
const commonIcons = [
  "Hash",
  "ChatCircleDots",
  "Megaphone",
  "BookOpen",
  "Code",
  "Rocket",
  "Lightbulb",
  "Star",
  "Bell",
  "Users",
  "Gear",
  "Briefcase",
]

// Get icon component by name
export function getIconComponent(iconName: string): React.ElementType {
  return iconMap[iconName] || HashIcon
}

interface IconPickerProps {
  value: string
  onChange: (iconName: string) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const [search, setSearch] = React.useState("")

  const allIconNames = Object.keys(iconMap)
  
  // Filter icons based on search
  const filteredIcons = React.useMemo(() => {
    if (!search) {
      // Show common icons first, then the rest
      const otherIcons = allIconNames.filter((name) => !commonIcons.includes(name))
      return [...commonIcons, ...otherIcons]
    }
    return allIconNames.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Input
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8"
      />
      <ScrollArea className="h-48">
        <div className="grid grid-cols-8 gap-1 p-1">
          {filteredIcons.map((iconName) => {
            const Icon = iconMap[iconName]
            const isSelected = value === iconName
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  "flex size-8 items-center justify-center rounded transition-colors",
                  isSelected
                    ? "bg-foreground text-background"
                    : "hover:bg-secondary text-foreground/70"
                )}
                title={iconName}
              >
                <Icon className="size-4" />
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
