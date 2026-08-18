export interface StickerDef {
  id: string;
  src: string;
  label: string;
}

export const STICKERS: StickerDef[] = [
  { id: "smile", src: "/stickers/smile.png", label: "Cười" },
  { id: "wink", src: "/stickers/wink.png", label: "Nháy mắt" },
  { id: "laugh", src: "/stickers/laugh.png", label: "Cười lớn" },
  { id: "love", src: "/stickers/love.png", label: "Yêu" },
  { id: "cool", src: "/stickers/cool.png", label: "Ngầu" },
  { id: "sad", src: "/stickers/sad.png", label: "Buồn" },
  { id: "angry", src: "/stickers/angry.png", label: "Giận" },
  { id: "wow", src: "/stickers/wow.png", label: "Bất ngờ" },
  { id: "sleepy", src: "/stickers/sleepy.png", label: "Buồn ngủ" },
  { id: "kiss", src: "/stickers/kiss.png", label: "Hôn" },
  { id: "heart", src: "/stickers/heart.png", label: "Tim" },
  { id: "hearts", src: "/stickers/hearts.png", label: "Nhiều tim" },
  { id: "thumbs-up", src: "/stickers/thumbs-up.png", label: "Like" },
  { id: "thumbs-down", src: "/stickers/thumbs-down.png", label: "Không thích" },
  { id: "clap", src: "/stickers/clap.png", label: "Vỗ tay" },
  { id: "fire", src: "/stickers/fire.png", label: "Lửa" },
  { id: "star", src: "/stickers/star.png", label: "Sao" },
  { id: "party", src: "/stickers/party.png", label: "Tiệc" },
  { id: "wave", src: "/stickers/wave.png", label: "Vẫy tay" },
  { id: "hug", src: "/stickers/hug.png", label: "Ôm" },
  { id: "sparkle", src: "/stickers/sparkle.png", label: "Lấp lánh" },
  { id: "ok", src: "/stickers/ok.png", label: "OK" },
];
