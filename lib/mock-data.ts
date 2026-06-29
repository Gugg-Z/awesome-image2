export type PromptItem = {
  id: string;
  title: string;
  category: string;
  tags: string[];
  image: string;
  height: number;
  prompt: string;
  negativePrompt: string;
  model: string;
  ratio: string;
  cost: number;
  author: string;
  uses: number;
  likes: number;
  status: "published" | "pending" | "rejected";
  aspectRatio?: number;
  displayMode?: "cover" | "contain" | "long" | "grid" | "poster";
};

export const categories = ["全部", "首页", "Pricing", "交流群", "API"];

export const popularTags = ["写实", "人像", "海报", "插画", "3D", "角色", "商业", "社交"];

export const prompts: PromptItem[] = [
  {
    id: "case-508",
    title: "木漏日庭院俯拍猫咪人像",
    category: "摄影写实",
    tags: ["摄影写实", "Photography", "Creative", "人像"],
    image: "/images/case508.jpg",
    height: 520,
    prompt: `俯拍镜头，高角度顶机位，自上而下俯瞰一位年轻的东亚裔女性，她有着精致的东亚五官和柔顺的黑发。她蹲在花园小径上，轻轻逗弄一只毛茸茸的橘猫。头顶密密的枝叶滤过阳光，形成灵动的“木漏日”效果——跃动、圆形的光斑在她的肌肤和猫毛上流转舞动。空气中悬浮着淡淡的潮湿薄雾，捕捉住光束，营造出柔和可见的立体光柱（丁达尔效应）。当她仰头朝向镜头时，一层轻雾柔化了画面边缘，增添梦幻氛围。她的表情从略带俏皮的轻噘嘴，渐渐转为眼角堆起细纹的真挚笑容，斑驳的光线恰好勾勒出她肌肤的细腻纹理和眼中盈盈的水光。`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "auto",
    cost: 10,
    author: "@ohmuyi",
    uses: 520,
    likes: 128,
    status: "published"
  },
  {
    id: "case-507",
    title: "暖调钩织角色玩偶",
    category: "角色人物",
    tags: ["角色人物", "Character", "Tech", "Commerce"],
    image: "/images/case507.jpg",
    height: 430,
    prompt: `A handcrafted crochet doll of a [subject], made with soft yarn textures and intricate knitted details. Dressed in a vivid [color1] accent and a delicate [color2] garment, holding a small [prop]. Set in a cozy [setting], warm muted atmosphere, charming handmade aesthetic, nostalgic amigurumi style.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "auto",
    cost: 10,
    author: "@azed_ai",
    uses: 519,
    likes: 127,
    status: "published"
  },
  {
    id: "case-506",
    title: "可爱发卡图文人像海报",
    category: "海报字体",
    tags: ["海报字体", "Poster", "Illustration", "Brand"],
    image: "/images/case506.jpg",
    height: 480,
    prompt: `围绕具体主题内容生成一张明亮清爽的图文合成视觉：画面以大面积高明度纯净色场承托主体，背景平整、通风、没有复杂景深，视觉重心由下方被大胆裁切的人像或真实主体建立，只露出最有记忆点的局部，使主体像从画面边缘进入。主体上方叠放一个极简图形符号或拟物角色，它要像轻轻坐在主体头顶或贴合轮廓生长出来，形体圆润、边缘干净、表情或结构由少量粗线完成，兼具标识感和亲近感。文字是画面的主动角色：顶部使用大号手写感标题，字距松、笔画柔软，像一句轻声招呼；中心用更强的竖向或轴向标题建立层级；边缘安放少量小字号信息，保持安静但精确，让空白继续占主导。色彩从主题自身的材质、情绪、地域或品牌语义中提取，映射为明亮底色、洁净主体亮面、清晰深色结构线与少量强调信息色，保留大面积轻快底场、小面积高对比文字线条、自然主体暗部的关系；整体保持高明度、清透、干净、饱和度清晰而不过度刺激，暗色只用于结构和阅读，不制造脏灰、烟雾或陈旧质感。摄影局部与扁平图形之间要形成真实与童趣的反差，边缘叠压准确，阴影极少，完成感像城市公共宣传与角色插画结合的轻松视觉系统。

主题：柳岩

比例9:16`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "9:16",
    cost: 10,
    author: "@xiaoxiaodong01",
    uses: 518,
    likes: 126,
    status: "published"
  },
  {
    id: "case-505",
    title: "夜间手机光沙发肖像",
    category: "摄影写实",
    tags: ["摄影写实", "Realistic", "Tech", "Social"],
    image: "/images/case505.jpg",
    height: 380,
    prompt: `A young adult woman with soft refined features, thin metal glasses, and shoulder-length dark tousled hair, leaning forward across a dark upholstered couch at night. She wears a pale cream lace-trim camisole with thin straps and matching soft shorts. One hand holds a smartphone close to the foreground, the screen glow casting cool reflections on her fingers and glasses lenses. Her expression is dreamy and softly tired, eyes lifted toward the camera as if she just looked up from scrolling, lips gently closed in a relaxed pout.

Shot in a vertical 3:4 frame at slightly above eye level, medium close-up to three-quarter portrait. Warm dim tungsten room light mixed with cool phone-screen reflections, no flash, soft falloff across the couch and wall. Shallow depth of field, soft low-light grain, slight motion blur, natural imperfect sharpness. Background: plain beige-gray wall, minimal decor, late-night atmosphere. Soft glam makeup: subtle eyeliner, long lashes, smooth skin, glossy pink-nude lips. Realistic social-media night portrait aesthetic.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "3:4",
    cost: 10,
    author: "@iamaiistudio",
    uses: 517,
    likes: 125,
    status: "published"
  },
  {
    id: "case-504",
    title: "粗糙涂鸦人像改图",
    category: "插画艺术",
    tags: ["插画艺术", "UI", "Realistic", "Illustration"],
    image: "/images/case504.jpg",
    height: 560,
    prompt: `Turn this photo into a chaotic funny doodle illustration, intentionally messy and low-skill, as if drawn quickly with a cheap marker, crayon, or worn-out felt pen on paper.

Create exaggerated facial features with awkward proportions, uneven eyes, oversized head, tiny body, crooked smile, and clumsy anatomy while still keeping the person recognizable. Use rough childish sketch lines, shaky hand-drawn strokes, visible scribbles, overlapping outlines, accidental marks, and random doodles around the scene. Add a simple cartoon-style background with badly drawn buildings, trees, clouds, street elements, and uneven perspective. Coloring should look careless and imperfect, with visible stroke texture, inconsistent fill areas, wax crayon texture, marker bleed, and irregular shading. Include playful imperfections like crossed-out lines, unfinished details, random arrows, tiny notes, stars, swirls, and abstract scribbles. Overall aesthetic should feel humorous, spontaneous, handmade, energetic, goofy, and intentionally unpolished, resembling a child's sketchbook mixed with absurd internet meme art. High texture detail, paper grain visible, asymmetrical composition, awkward framing, expressive doodle chaos, raw sketch energy.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "auto",
    cost: 10,
    author: "@Shorelyn_",
    uses: 516,
    likes: 124,
    status: "published"
  },
  {
    id: "case-503",
    title: "霓虹设计师 3D 海报",
    category: "海报字体",
    tags: ["海报字体", "UI", "Poster", "3D"],
    image: "/images/case503.jpg",
    height: 455,
    prompt: `Create an ultra-detailed 3D stylized creative designer poster featuring a cool young digital artist standing confidently in the center of a futuristic blue neon studio. The character wears oversized black streetwear with electric-blue graphic accents, black cargo pants, layered silver chains, black sunglasses, and clean white sneakers. A cute fluffy puppy sits on the artist's shoulder. The camera angle is dramatic low-angle perspective, making the sneakers appear larger for a premium poster effect.

Surround the character with floating creative elements including a glowing laptop, professional camera, design books, notebooks, 3D icons, social media symbols, holographic UI panels, graphic design tools, and futuristic blue geometric shapes. Add motivational typography such as "DESIGN MODE", "CREATE • BUILD • INSPIRE", and "CREATIVE NEVER SLEEPS" integrated into the scene.

Include a collectible chibi mini-figure version of the character standing beside the main subject on a display base. Use cinematic blue lighting, glossy reflections, volumetric glow, depth of field, floating particles, luxury toy-photography aesthetics, high-end 3D rendering, Octane Render quality, ultra-sharp details, vibrant neon blue color palette, futuristic creator workspace atmosphere, premium commercial poster design, trending ArtStation style, masterpiece quality, 8K resolution, vertical 9:16 composition.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "9:16",
    cost: 10,
    author: "@AiwithLariab",
    uses: 515,
    likes: 123,
    status: "published"
  },
  {
    id: "case-502",
    title: "黑桃国王递归扑克牌",
    category: "角色人物",
    tags: ["角色人物", "Poster", "Realistic", "Fashion"],
    image: "/images/case502.jpg",
    height: 600,
    prompt: `Use my uploaded face image as the primary identity reference. Preserve my exact facial identity with extremely high fidelity: identical facial structure, jawline, cheekbones, eye shape, eyebrows, nose, lips, beard pattern, hairstyle, hair texture, skin tone, skin texture, and overall recognizable appearance. Do not beautify, alter, or reinterpret my face. Maintain realistic anatomy and authentic likeness.

Create an ultra-detailed, cinematic, surreal luxury playing-card artwork.

The main subject is me as the King of Spades, occupying the full design of a magnificent, royal Ace-quality playing card. I wear elaborate black-and-silver spade-themed regalia, a crown forged from obsidian and polished steel, intricate embroidered armor, and flowing royal garments decorated with subtle spade symbols. My expression is calm, intelligent, and powerful.

In my right hand, I am holding a pristine Ace of Spades card.

The creative twist: the Ace of Spades I am holding is not a normal card. It contains another complete playing-card illustration. Inside that card, I again appear as the King of Spades, and that entire card is being elegantly held between the fingers of a majestic Queen of Hearts. The Queen is graceful, regal, and visually striking, dressed in rich crimson and gold royal attire adorned with heart motifs.

The illusion continues with subtle recursive storytelling: the Queen of Hearts appears to be examining the card with fascination, creating a “card within a card” visual paradox. The composition should feel like a legendary tale of power, strategy, love, and destiny intertwined.

Add impossible Escher-inspired visual design elements:
•Infinite recursion effect
•Card-world folding into itself
•Floating spade and heart symbols transforming into ravens and rose petals
•Ornate golden borders extending beyond physical card edges
•Royal chess pieces suspended in midair
•Fractal patterns hidden within the card engravings
•Elegant smoke forming suit symbols
•Dimensional portals emerging from card corners

Style: ultra-realistic fantasy realism mixed with luxury casino art, Renaissance royal portraiture, and modern cinematic concept art.

Lighting: dramatic chiaroscuro, volumetric god rays, rich contrast, glowing metallic highlights, subtle magical energy around the Ace of Spades.

Color palette:
•Deep blacks
•Silver chrome
•Ivory white
•Crimson red
•Antique gold accents

Composition:
•Vertical masterpiece
•Museum-quality detail
•Hyper-realistic textures
•Intricate card engravings
•Perfectly symmetrical playing-card aesthetics blended with cinematic depth
•Sharp focus on my face
•Extremely high identity fidelity
•Epic storytelling through visual symbolism

The final image should feel like the cover of a legendary fantasy card game where the King of Spades has become self-aware, existing across multiple layers of reality while being held in the hands of fate itself, represented by the Queen of Hearts.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "auto",
    cost: 10,
    author: "@Professor_134",
    uses: 514,
    likes: 122,
    status: "published"
  },
  {
    id: "case-501",
    title: "夏日牵手回眸电影肖像",
    category: "摄影写实",
    tags: ["摄影写实", "Realistic", "Character", "Social"],
    image: "/images/case501.jpg",
    height: 420,
    prompt: `Cinematic portrait photography, ultra-photorealistic, 2160x3840 vertical composition, 50mm or 85mm portrait lens rendering, shallow depth of field, clean translucent summer natural-light color grading — not overly yellow, not over-filtered.

Subject: a young beautiful adult East Asian woman, [describe face shape and features, e.g. soft heart-shaped face, refined classical features, bright almond/fox eyes, petite nose bridge, naturally full lips], overall vibe sweet, sunny, energetic, cute with a touch of allure. Gaze highly engaging — bright, clear, natural catchlights, as if it speaks; corners of mouth slightly lifted, expression gentle, vivid, natural.

She walks along a [scene, e.g. garden stone path / tree-lined lane / European street / courtyard], right hand reaching back to hold the hand of someone behind her; only their hand appears in the lower-left corner — like a first-person couple's POV snapshot. She glances back at the camera while her body stays in a forward walking motion, posture elegant and natural, clearly a candid captured moment with a faint in-love feeling.

Long [hair color] hair, [style, e.g. naturally wavy / relaxed big waves / airy bangs / half-up], many strands tousled and flying in the wind, richly layered and dynamic. Strong natural side-backlight rims the hair edges — clean, crisp rim light and semi-translucent glow, hair edges lit as if by sunlight, light and luminous. This is the core highlight of the image.

She wears [outfit, e.g. white lace slip dress / beige slip dress / light-blue short-sleeve top with white skirt / light-pink fitted dress], fabric texture natural, material light and soft. Bright natural summer sunlight realistically warms her skin, shoulders, collarbone, and clothing with soft, clean highlight transitions.

Skin texture: extremely realistic — visible fine pores, natural skin texture, faint imperfections, subtle tone variation, soft sheen. Cheeks, nose tip, shoulders show natural delicate gradations in sunlight. Translucent, healthy, real and refined — no plastic look, no waxwork, no over-smoothing.

Background: soft atmospheric blur, never distracting.

Avoid: over-smoothing, plastic skin, CG look, anime look, wig look, stiff expression, dead eyes, stiff poses, overall yellow cast, overexposed face, distorted features, wrong fingers, deformed hands, cluttered background, heavy influencer retouching.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "9:16",
    cost: 10,
    author: "@iamaiistudio",
    uses: 513,
    likes: 121,
    status: "published"
  },
  {
    id: "case-500",
    title: "梦幻花冠仙境肖像",
    category: "摄影写实",
    tags: ["摄影写实", "Realistic", "Fashion", "人像"],
    image: "/images/case500.jpg",
    height: 500,
    prompt: `Ultra-realistic ethereal fantasy portrait of a breathtaking young woman with delicate porcelain skin, soft grey-blue eyes, and natural rosy lips. She gazes gently toward the viewer with a serene, dreamy expression, her fingertips lightly touching her chin. Wispy ash-brown hair flows softly in the breeze, styled in a loose romantic updo adorned with pastel blush roses, shimmering crystal ornaments, delicate feathers, and intricate floral accessories. She wears elegant dangling crystal earrings and a translucent, flowing gown made of sheer iridescent fabric embroidered with tiny sparkling flowers.

The scene is bathed in soft diffused morning light, creating a luminous glow around her face and shoulders. Surrounded by floating butterflies, sparkling dust particles, translucent petals, and dreamy floral textures, the background blends pastel lavender, pearl white, blush pink, and silver tones. Cinematic fine-art photography, fairycore aesthetic, enchanted garden atmosphere, magical realism, ultra-detailed skin texture, soft focus highlights, volumetric lighting, bokeh, masterpiece quality, highly detailed, 8K resolution, delicate feminine beauty, romantic fantasy artwork, elegant composition, dreamy color grading, soft glow, celestial ambiance.`,
    negativePrompt: "",
    model: "gpt-image-2",
    ratio: "auto",
    cost: 10,
    author: "@HaniaAi12",
    uses: 512,
    likes: 120,
    status: "published"
  }
];

export const submissions = [
  { id: "S-1028", title: "儿童绘本风森林小屋", user: "青木", status: "待审核", reward: 30, date: "06-29" },
  { id: "S-1027", title: "潮玩盲盒产品图", user: "Mango", status: "待审核", reward: 30, date: "06-29" },
  { id: "S-1024", title: "未来感耳机海报", user: "Kiki", status: "已通过", reward: 30, date: "06-28" }
];

export const creditLogs = [
  { type: "生成同款", amount: -10, note: "木漏日庭院俯拍猫咪人像", time: "今天 21:20" },
  { type: "作者分成", amount: 2, note: "梦幻花冠仙境肖像被使用", time: "今天 20:11" },
  { type: "投稿奖励", amount: 30, note: "未来感耳机海报审核通过", time: "昨天 18:42" },
  { type: "后台充值", amount: 200, note: "模拟充值", time: "昨天 09:30" }
];

export const generationLogs = [
  { prompt: "木漏日庭院俯拍猫咪人像", cost: 10, status: "成功", time: "今天 21:20" },
  { prompt: "霓虹设计师 3D 海报", cost: 10, status: "成功", time: "今天 17:03" },
  { prompt: "粗糙涂鸦人像改图", cost: 10, status: "失败", time: "昨天 23:14" }
];
