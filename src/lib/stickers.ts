export interface StickerDef {
  id: string;
  src: string;
  label: string;
}

export const STICKERS: StickerDef[] = [
  { id: "smile", src: "/stickers/smile.svg", label: "Cười" },
  { id: "wink", src: "/stickers/wink.svg", label: "Nháy mắt" },
  { id: "laugh", src: "/stickers/laugh.svg", label: "Cười lớn" },
  { id: "love", src: "/stickers/love.svg", label: "Yêu" },
  { id: "cool", src: "/stickers/cool.svg", label: "Ngầu" },
  { id: "sad", src: "/stickers/sad.svg", label: "Buồn" },
  { id: "angry", src: "/stickers/angry.svg", label: "Giận" },
  { id: "wow", src: "/stickers/wow.svg", label: "Bất ngờ" },
  { id: "sleepy", src: "/stickers/sleepy.svg", label: "Buồn ngủ" },
  { id: "kiss", src: "/stickers/kiss.svg", label: "Hôn" },
  { id: "heart", src: "/stickers/heart.svg", label: "Tim" },
  { id: "hearts", src: "/stickers/hearts.svg", label: "Nhiều tim" },
  { id: "thumbs-up", src: "/stickers/thumbs-up.svg", label: "Like" },
  { id: "thumbs-down", src: "/stickers/thumbs-down.svg", label: "Không thích" },
  { id: "clap", src: "/stickers/clap.svg", label: "Vỗ tay" },
  { id: "fire", src: "/stickers/fire.svg", label: "Lửa" },
  { id: "star", src: "/stickers/star.svg", label: "Sao" },
  { id: "party", src: "/stickers/party.svg", label: "Tiệc" },
  { id: "wave", src: "/stickers/wave.svg", label: "Vẫy tay" },
  { id: "hug", src: "/stickers/hug.svg", label: "Ôm" },
  { id: "sparkle", src: "/stickers/sparkle.svg", label: "Lấp lánh" },
  { id: "ok", src: "/stickers/ok.svg", label: "OK" },
];
