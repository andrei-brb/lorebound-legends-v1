import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Volume2, Music, Eye, Sparkles, Trash2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PlayerState, AppSettings } from "@/lib/playerState";
import { setSfxVolume } from "@/lib/sfx";

interface SettingsPanelProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

const DEFAULTS: AppSettings = { musicVol: 0.7, sfxVol: 0.8, reduceMotion: false, animationsOn: true };

export default function SettingsPanel({ playerState, onStateChange }: SettingsPanelProps) {
  const settings = playerState.settings ?? DEFAULTS;
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Sync sfx volume on mount + whenever it changes
  useEffect(() => { setSfxVolume(settings.sfxVol); }, [settings.sfxVol]);

  // Apply reduce-motion CSS hook on document
  useEffect(() => {
    const cls = "reduce-motion";
    if (settings.reduceMotion) document.documentElement.classList.add(cls);
    else document.documentElement.classList.remove(cls);
  }, [settings.reduceMotion]);

  const update = (patch: Partial<AppSettings>) => {
    onStateChange({ ...playerState, settings: { ...settings, ...patch } });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Settings"
          title="Settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* SFX */}
          <div>
            <Label className="text-sm flex items-center gap-2 mb-2">
              <Volume2 className="w-4 h-4 text-primary" /> Sound effects
              <span className="ml-auto text-xs text-muted-foreground">{Math.round(settings.sfxVol * 100)}%</span>
            </Label>
            <Slider
              value={[Math.round(settings.sfxVol * 100)]}
              onValueChange={(v) => update({ sfxVol: (v[0] ?? 0) / 100 })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Music */}
          <div>
            <Label className="text-sm flex items-center gap-2 mb-2">
              <Music className="w-4 h-4 text-primary" /> Music
              <span className="ml-auto text-xs text-muted-foreground">{Math.round(settings.musicVol * 100)}%</span>
            </Label>
            <Slider
              value={[Math.round(settings.musicVol * 100)]}
              onValueChange={(v) => update({ musicVol: (v[0] ?? 0) / 100 })}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Music tracks reserved for a future update.</p>
          </div>

          {/* Reduce motion */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <Label className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Reduce motion
            </Label>
            <Switch checked={settings.reduceMotion} onCheckedChange={(v) => update({ reduceMotion: v })} />
          </div>

          {/* Animations on */}
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Ambient animations
            </Label>
            <Switch checked={settings.animationsOn} onCheckedChange={(v) => update({ animationsOn: v })} />
          </div>

          {/* Danger zone */}
          <div className="border-t border-destructive/20 pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3 text-destructive" /> Danger Zone
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-destructive/40 text-destructive text-sm hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete Character
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-destructive text-center">This resets everything. Cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      localStorage.removeItem("mythic-arcana-player");
                      window.location.reload();
                    }}
                    className="flex-1 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-bold hover:brightness-110 transition-all"
                  >
                    Yes, Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
