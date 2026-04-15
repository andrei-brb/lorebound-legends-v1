/**
 * Card drop event system — random drops in Discord channels.
 * Called from the interaction handler when /mythic drop is used,
 * or can be triggered on a schedule via setInterval in token-server.
 */

// Pick a random card weighted by rarity
const RARITY_WEIGHTS = { legendary: 5, rare: 20, common: 75 };

export function pickRandomDropCard(allCardIds, getCardRarity) {
  const roll = Math.random() * 100;
  let targetRarity;
  if (roll < RARITY_WEIGHTS.legendary) targetRarity = "legendary";
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.rare) targetRarity = "rare";
  else targetRarity = "common";

  const candidates = allCardIds.filter((id) => getCardRarity(id) === targetRarity);
  if (candidates.length === 0) {
    // fallback to any card
    return allCardIds[Math.floor(Math.random() * allCardIds.length)];
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// Build the Discord embed for a card drop
export function buildDropEmbed(cardId, cardName, rarity, element) {
  const rarityColors = { legendary: 0xD4A020, rare: 0x4488DD, common: 0x888899 };
  const elementEmoji = { fire: "🔥", water: "💧", nature: "🌿", shadow: "🌑", light: "☀️", neutral: "⚪" };

  return {
    embeds: [
      {
        title: "🎴 A Wild Card Appeared!",
        description: `**${cardName}** has dropped!\n\nReact with ✅ to claim it!`,
        color: rarityColors[rarity] || 0x888899,
        fields: [
          { name: "Rarity", value: `${rarity.charAt(0).toUpperCase() + rarity.slice(1)}`, inline: true },
          { name: "Element", value: `${elementEmoji[element] || "⚪"} ${element || "neutral"}`, inline: true },
        ],
        footer: { text: "First to react claims the card!" },
      },
    ],
    // Components: add a button for claiming
    components: [
      {
        type: 1, // ACTION_ROW
        components: [
          {
            type: 2, // BUTTON
            style: 3, // SUCCESS
            label: "Claim Card!",
            custom_id: `claim_drop_${cardId}`,
            emoji: { name: "✅" },
          },
        ],
      },
    ],
  };
}

// Process a card claim from a button interaction
export async function processCardClaim(prisma, discordUserId, username, avatar, cardId) {
  // Find or create the player
  let player = await prisma.player.findUnique({
    where: { discordId: discordUserId },
    include: { cards: true },
  });

  if (!player) {
    player = await prisma.player.create({
      data: {
        discordId: discordUserId,
        username: username,
        avatar: avatar || null,
        gold: 500,
        stardust: 0,
        pityCounter: 0,
        totalPulls: 0,
        hasCompletedOnboarding: false,
        selectedPath: null,
        battleStats: { create: {} },
      },
      include: { cards: true },
    });
  }

  // Check if already owns this card (dupe handling)
  const existing = player.cards.find((c) => c.cardId === cardId);
  if (existing) {
    // Increment dupe count
    await prisma.cardProgress.update({
      where: { id: existing.id },
      data: { dupeCount: existing.dupeCount + 1, xp: existing.xp + 50 },
    });
    return { claimed: true, isDuplicate: true };
  }

  // Add new card
  await prisma.cardProgress.create({
    data: {
      playerId: player.id,
      cardId,
      level: 1,
      xp: 0,
      prestigeLevel: 0,
      dupeCount: 0,
      goldStars: 0,
      redStars: 0,
    },
  });

  return { claimed: true, isDuplicate: false };
}
