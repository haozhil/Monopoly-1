export const BOARD_PADDING = 96;
export const TILE_SIZE = 250;
export const TILE_GAP = 24;
export const BOARD_GRID_SIZE = 8;
export const WORLD_SIZE = BOARD_PADDING * 2 + BOARD_GRID_SIZE * TILE_SIZE + (BOARD_GRID_SIZE - 1) * TILE_GAP;

const mainPathSlots = [
  { row: 7, col: 7 },
  { row: 7, col: 6 },
  { row: 7, col: 5 },
  { row: 7, col: 4 },
  { row: 7, col: 3 },
  { row: 7, col: 2 },
  { row: 7, col: 1 },
  { row: 7, col: 0 },
  { row: 6, col: 0 },
  { row: 5, col: 0 },
  { row: 4, col: 0 },
  { row: 3, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 0, col: 4 },
  { row: 0, col: 5 },
  { row: 0, col: 6 },
  { row: 0, col: 7 },
  { row: 1, col: 7 },
  { row: 2, col: 7 },
  { row: 3, col: 7 },
  { row: 4, col: 7 },
  { row: 5, col: 7 },
  { row: 6, col: 7 },
];

const mainTileDefs = [
  { type: "start", name: "起点", description: "每次经过或停在这里，获得 200。" },
  { type: "property", name: "老街", price: 180, rent: 36, color: "#c84c2c" },
  { type: "chance", name: "机会", description: "抽一张事件卡。" },
  { type: "property", name: "港口", price: 220, rent: 44, color: "#efb649" },
  { type: "tax", name: "税务局", amount: 120, description: "缴纳固定税金。" },
  { type: "property", name: "商店街", price: 260, rent: 52, color: "#4f7a52" },
  { type: "bonus", name: "奖金池", amount: 150, description: "收到一笔奖金。" },
  { type: "property", name: "金融区", price: 320, rent: 68, color: "#1d6781" },
  { type: "chance", name: "命运", description: "抽一张事件卡。" },
  { type: "property", name: "科技园", price: 360, rent: 76, color: "#8c2f17" },
  { type: "tax", name: "维修费", amount: 140, description: "资产维护产生费用。" },
  { type: "property", name: "天际线", price: 420, rent: 92, color: "#5c3b98" },
  { type: "property", name: "文化宫", price: 460, rent: 98, color: "#b04f2d" },
  { type: "chance", name: "机遇站", description: "抽一张事件卡。" },
  { type: "bonus", name: "中央公园", amount: 180, description: "城市活动奖金。" },
  { type: "property", name: "艺术街", price: 500, rent: 106, color: "#c05d4b" },
  { type: "tax", name: "房产税", amount: 160, description: "缴纳城区房产税。" },
  { type: "property", name: "影视城", price: 540, rent: 118, color: "#d49d3f" },
  { type: "chance", name: "命运", description: "抽一张事件卡。" },
  { type: "property", name: "观景台", price: 580, rent: 126, color: "#3d7d67" },
  { type: "bonus", name: "城际站", amount: 220, description: "旅运红利到账。" },
  { type: "property", name: "海湾区", price: 620, rent: 138, color: "#2e6e8f" },
  { type: "chance", name: "机会", description: "抽一张事件卡。" },
  { type: "property", name: "会展心", price: 660, rent: 148, color: "#8b3a5c" },
  { type: "tax", name: "医疗账单", amount: 180, description: "支付城市医疗费用。" },
  { type: "property", name: "创业港", price: 700, rent: 156, color: "#b76b25" },
  { type: "chance", name: "命运", description: "抽一张事件卡。" },
  { type: "property", name: "云顶酒店", price: 760, rent: 170, color: "#4a5b9d" },
];

const mainTiles = mainTileDefs.map((tile, id) => ({
  ...tile,
  id,
  row: mainPathSlots[id].row,
  col: mainPathSlots[id].col,
  nextIds: [(id + 1) % mainTileDefs.length],
  previousId: id === 0 ? mainTileDefs.length - 1 : id - 1,
}));

const branchTiles = [
  { id: 28, type: "property", name: "旧桥口", price: 240, rent: 48, color: "#cd8a5b", row: 6, col: 6, nextIds: [29], previousId: 1 },
  { id: 29, type: "bonus", name: "桥畔广场", amount: 90, description: "收到桥区补助。", row: 5, col: 6, nextIds: [30], previousId: 28 },
  { id: 30, type: "chance", name: "桥梁事件", description: "抽一张事件卡。", row: 5, col: 5, nextIds: [31], previousId: 29 },
  { id: 31, type: "property", name: "桥塔", price: 280, rent: 56, color: "#8d6a47", row: 5, col: 4, nextIds: [32], previousId: 30 },
  { id: 32, type: "property", name: "税务连廊", price: 300, rent: 60, color: "#6786a1", row: 6, col: 4, nextIds: [4], previousId: 31 },
];

mainTiles[1] = {
  ...mainTiles[1],
  nextIds: [2, 28],
};

export const tiles = [...mainTiles, ...branchTiles];

export const avatarPresets = [
  { id: "ava-sun", label: "晴空", skin: "#f5d3b4", hair: "#5a3826", shirt: "#c84c2c", bg: "#ffe8dc", accent: "#c84c2c" },
  { id: "ava-wave", label: "海风", skin: "#f6d4bd", hair: "#1f3347", shirt: "#1d6781", bg: "#dfeff5", accent: "#1d6781" },
  { id: "ava-mint", label: "薄荷", skin: "#f2cdae", hair: "#35543d", shirt: "#4f7a52", bg: "#e4f1e2", accent: "#4f7a52" },
  { id: "ava-gold", label: "鎏金", skin: "#f0c8a3", hair: "#5a3b15", shirt: "#efb649", bg: "#faefd2", accent: "#d99b1f" },
  { id: "ava-berry", label: "莓果", skin: "#f4d0bc", hair: "#5c275a", shirt: "#b04687", bg: "#f7e1ef", accent: "#b04687" },
  { id: "ava-slate", label: "石板", skin: "#ecc8a7", hair: "#2e2e36", shirt: "#5f6477", bg: "#ececf3", accent: "#5f6477" },
  { id: "ava-flame", label: "焰光", skin: "#f6cfaf", hair: "#7b2d17", shirt: "#de6a32", bg: "#ffe6dc", accent: "#de6a32" },
  { id: "ava-lav", label: "晨雾", skin: "#f1cfb3", hair: "#49406f", shirt: "#7b72ba", bg: "#ece9fb", accent: "#7b72ba" },
];
