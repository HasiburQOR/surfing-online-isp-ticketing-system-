import {
  Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck,
  Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal,
  Smartphone, CreditCard, Activity, Sparkles, type LucideIcon,
} from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Wifi, Gauge, Phone, Mail, MapPin, Clock, Headphones, ShieldCheck,
  Cable, Router, Globe, Zap, Users, CheckCircle2, Server, Signal,
  Smartphone, CreditCard, Activity, Sparkles,
}

export function resolveIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Wifi
}
