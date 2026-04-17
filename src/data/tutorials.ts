export interface TutorialStep {
  title: string;
  body: string;
  icon: string;
}

export const TUTORIALS: Record<string, TutorialStep[]> = {
  collection: [
    { icon: "📚", title: "Your Collection", body: "Every card you own lives here. Filter by rarity or element to find what you need." },
    { icon: "🔄", title: "Flip for details", body: "Click any card to flip it and read its lore, abilities, and synergies." },
    { icon: "⭐", title: "Stars matter", body: "Duplicate pulls grant stars and Stardust. Stars boost a card's stats permanently." },
  ],
  cosmetics: [
    { icon: "🎨", title: "Cosmetics locker", body: "Everything you unlock from the Battle Pass and seasons appears here when you own it." },
    { icon: "✨", title: "Equip per slot", body: "Pick one item per category — board skin, frame, card back, border, title, and emote." },
    { icon: "🃏", title: "See it in battle", body: "Frames and backs show on cards in your collection and in matches. Board skins appear on the battle board." },
  ],
  catalog: [
    { icon: "🗺️", title: "Card Catalog", body: "The complete index of every card in the game — owned and unowned." },
    { icon: "🔍", title: "Plan your hunt", body: "Use this to spot which Legendaries you're missing before opening a pack." },
  ],
  summon: [
    { icon: "✨", title: "Summon cards", body: "Spend gold or stardust to open packs. Each pack has its own pull rates." },
    { icon: "⏰", title: "Free pack daily", body: "Don't miss the free starter pack — it resets every 24 hours." },
    { icon: "🎯", title: "Pity protection", body: "After enough pulls without a Legendary, your next one is guaranteed." },
  ],
  deck: [
    { icon: "🃏", title: "Build a Deck", body: "Pick up to 10 cards. A balanced deck mixes attackers, defenders, and spells." },
    { icon: "💾", title: "Save presets", body: "Save your favorite decks so you can swap loadouts in one click." },
    { icon: "⚔️", title: "Start the fight", body: "Hit Battle to take your deck into combat against the AI." },
  ],
  battle: [
    { icon: "⚔️", title: "Welcome to Battle", body: "Take down your opponent's hero by playing cards and attacking each turn." },
    { icon: "🎯", title: "Tap then act", body: "Tap a card on the field to open the radial menu — attack, ability, or info." },
    { icon: "🔚", title: "End your turn", body: "When you're done, end your turn. Wins grant gold, XP, and BP progress." },
  ],
  workshop: [
    { icon: "🔨", title: "Crafting Workshop", body: "Fuse low-rarity duplicates into higher rarities, or sacrifice cards for Stardust." },
    { icon: "💎", title: "Stardust economy", body: "Stardust unlocks special seasonal packs and boosts in the shop." },
  ],
  pvp: [
    { icon: "👑", title: "Player vs Player", body: "Set a ranked deck, then queue async or challenge a friend live." },
    { icon: "📈", title: "Ranked seasons", body: "Win matches to climb tiers and earn season-end rewards." },
  ],
  workshop_legacy: [],
  daily: [
    { icon: "🎁", title: "Daily Hub", body: "Login bonuses, hourly chests, first-win rewards, and mystery boxes — all here." },
    { icon: "🔥", title: "Build your streak", body: "Log in every day to keep your streak alive — bigger streaks unlock bigger payouts later." },
  ],
  profile: [
    { icon: "🧙", title: "Your Profile", body: "Pick an avatar and title, then watch your stats grow as you play." },
    { icon: "🏆", title: "Unlock as you go", body: "Most avatars and titles unlock automatically when you earn achievements." },
  ],
  social_friends: [
    { icon: "👥", title: "Friends", body: "Add players by username. Accepted friends show their online status." },
    { icon: "⚡", title: "Live invites", body: "From a friend's row you can challenge them to a live PvP match." },
  ],
  social_chat: [
    { icon: "💬", title: "Global Chat", body: "Talk with everyone playing right now. Be kind, be curious." },
    { icon: "🛡️", title: "Guild Chat", body: "Join or create a guild for a private channel with your crew." },
  ],
  social_guild: [
    { icon: "🛡️", title: "Guilds", body: "Team up with up to 30 players. Each week the guild shares a goal worth bonus rewards." },
  ],
  social_spectate: [
    { icon: "👀", title: "Spectate", body: "Watch live PvP matches in progress. Great for learning new strategies." },
  ],
};
