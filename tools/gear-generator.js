// 装备/载具/义体获得事件生成器 - 夜之城人生重开模拟器
// 生成200条装备获得事件 (ID 30500-30699)
// 用法: node tools/gear-generator.js

import { writeFileSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const items = JSON.parse(readFileSync(join(DATA_DIR, 'items.json'), 'utf-8'));
const vehicles = JSON.parse(readFileSync(join(DATA_DIR, 'vehicles.json'), 'utf-8'));

const wpnIds = Object.keys(items).filter(k => k.startsWith('wpn_'));
const impIds = Object.keys(items).filter(k => k.startsWith('imp_'));
const allItemIds = Object.keys(items);
const vehIds = Object.keys(vehicles);

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function maybe(chance) { return Math.random() < chance; }

// ============================================================
// 武器获得事件模板 (30500-30549, 50条)
// ============================================================
const weaponEventTemplates = [
  // 黑市购买 (1-10)
  { event: "你在沃森区的地下黑市发现了一把品相不错的{wpn}，卖家是个戴着面具的独眼老兵。你花了{cost}欧将它收入囊中。", awardRate: 0.9 },
  { event: "歌舞伎町的一个小巷子里，一个神秘商人对你说'朋友，有好东西'。他打开一个金属箱——里面是一把{wpn}。你掏出了{cost}欧。", awardRate: 0.85 },
  { event: "你在太平洲的夜市里找到了一个出售走私武器的摊位——{wpn}摆在最显眼的位置。经过一番讨价还价，你以{cost}欧成交。", awardRate: 0.9 },
  { event: "暗网上的一个卖家联系了你——他手里有一批'清仓特价'武器。你花{cost}欧买到了一把{wpn}，物流用了三个小时。", awardRate: 0.85 },
  { event: "你在一个地下武器交易会上发现了{wpn}，卖家声称这是'军用淘汰品'。不管真假，你花{cost}欧买下了它。", awardRate: 0.9 },
  { event: "圣多明哥的一个帮派成员急需用钱，向你推销他的{wpn}。品相还行，价格也不错——{cost}欧。", awardRate: 0.85 },
  { event: "你在黑市上认识了一个叫'铁匠'的军火贩子。他说'信我一次'，拿出了{wpn}。你付了{cost}欧，它竟然真的能用。", awardRate: 0.9 },
  { event: "一个走投无路的佣兵在来生酒吧向你低价出售他的{wpn}。他说'我金盆洗手了'。你花{cost}欧捡了个便宜。", awardRate: 0.85 },
  { event: "你的线人告诉你，港口区有一批从军用科技偷出来的武器正在甩卖。你赶过去抢到了一把{wpn}，花了{cost}欧。", awardRate: 0.9 },
  { event: "一个从战区回来的雇佣兵在街边摆摊卖'战利品'——你挑中了一把{wpn}，花了{cost}欧。枪身上还有弹痕。", awardRate: 0.85 },
  // 战场/任务拾取 (11-20)
  { event: "在一次激烈的街头交火后，你在地上捡到了一把遗落的{wpn}。原来的主人已经不需要它了。你擦了擦血迹把它收入背包。", awardRate: 0.8, free: true },
  { event: "帮派据点被清剿后，你在一堆废墟中翻出了一把{wpn}。虽然有些磨损，但功能完好。这就是夜之城的'二手市场'。", awardRate: 0.8, free: true },
  { event: "你在一个被遗弃的安全屋中发现了一个隐藏的武器库——{wpn}就躺在枪架上，旁边的弹药还剩大半箱。", awardRate: 0.75, free: true },
  { event: "完成一次危险的任务后，中间人除了报酬外还附赠了一把{wpn}。他说'这是给你的额外奖励'。", awardRate: 0.9 },
  { event: "你在战场废墟中搜刮物资时，从一个阵亡佣兵的装备袋里找到了一把{wpn}。你沉默了一会儿，然后把它收了起来。", awardRate: 0.8, free: true },
  { event: "NCPD在一次行动后封锁了一片区域——你趁乱溜进去捡到了一把{wpn}，它被扔在路边的排水沟里。", awardRate: 0.7, free: true },
  { event: "你帮一个义体医生解决了几个麻烦后，他给了你一把{wpn}作为报酬。'我不需要武器，我需要的是手术刀。'他说。", awardRate: 0.85 },
  { event: "你在太平洲的垃圾场里翻找零件时，意外发现了一把还能用的{wpn}——被丢弃在旧电视和废电池之间。", awardRate: 0.7, free: true },
  { event: "一次工厂爆炸后你潜入现场搜刮，在一间上锁的储物室里找到了{wpn}。锁是电子的，但你的技术手段比它更快。", awardRate: 0.8, free: true },
  { event: "你在清理一个帮派仓库时发现了一批密封的武器箱——打开后里面是一把全新的{wpn}。也许是某批走私货被遗忘了。", awardRate: 0.85, free: true },
  // 赠送/奖励/特殊 (21-35)
  { event: "你的老战友退役前把他的{wpn}送给了你——'这把枪跟了我十年，现在它跟你。'它已经有些年头了，但被保养得很好。", awardRate: 0.8, free: true },
  { event: "荒坂的一次内部清理中，一批装备流入了黑市。你通过中间人搞到了一把{wpn}，花了{cost}欧。", awardRate: 0.9 },
  { event: "你在赛博空间里赢了一场地下武器竞拍——一把{wpn}，起拍价很低但竞争很激烈。你最终花了{cost}欧拿下。", awardRate: 0.85 },
  { event: "一个武器收藏家去世后，他的藏品被家属清仓出售。你在其中发现了一把保存完好的{wpn}，花了{cost}欧。", awardRate: 0.85 },
  { event: "军用科技的安全漏洞被黑客利用，一批实验性武器流入了民间市场。你花{cost}欧买到了一把{wpn}——它有些功能你从未见过。", awardRate: 0.9 },
  { event: "你在一次危机中救了一个军火商，他感激涕零地送了你一把{wpn}。'这算利息，本金下次再说。'", awardRate: 0.85, free: true },
  { event: "你在暗网上接了一个'回收'任务——去一个指定地点取回{wpn}。你完成了任务，雇主让你保留了武器作为额外报酬。", awardRate: 0.8, free: true },
  { event: "帮派战争结束后，胜利的一方在大街上分发'战利品'。你凑热闹排了队，获得了一把{wpn}。", awardRate: 0.75, free: true },
  { event: "你在一场地下格斗赛的奖金中意外获得了一把{wpn}——举办方说'我们用实物支付'。你检查了一下，是真货。", awardRate: 0.8, free: true },
  { event: "你的一个客户是武器测试员——他经常能搞到原型武器。这次他给了你一把{wpn}，说是'量产前的测试版'。", awardRate: 0.9, free: true },
  { event: "一个流浪的军火匠人在街头给你展示了他的手艺——他当场用废旧零件拼装了一把{wpn}，并以{cost}欧的价格卖给了你。", awardRate: 0.85 },
  { event: "你在一次夜闯企业大楼的任务中，顺手从一个军械库里拿了{wpn}。警报在你离开后才响起。", awardRate: 0.8, free: true },
  { event: "你在来生酒吧的角落里发现了一个无人认领的包裹——打开后发现是一把{wpn}。你环顾四周，没有人注意到你。", awardRate: 0.7, free: true },
  { event: "你的前雇主在破产清算前，偷偷把一把{wpn}作为'最后的薪水发'给了你。至少他还有一点良心。", awardRate: 0.8, free: true },
  { event: "一个神秘的包裹送到了你的住处——没有寄件人信息。里面是一把{wpn}和一张纸条：'你会需要它的。'", awardRate: 0.85, free: true },
  { event: "你在一个被封的帮派据点里找到了一把{wpn}——它被锁在保险柜里，但密码是四个零。真不知道这帮帮派分子是怎么活到现在的。", awardRate: 0.8, free: true },
  // 更多武器获得 (36-50)
  { event: "你在夜间巡逻时从一个犯罪现场捡到了一把{wpn}——NCPD还没到，你先到一步。你迅速把它收了起来。", awardRate: 0.7, free: true },
  { event: "你在港口区的集装箱堆场里发现了一个走私用的暗格——里面藏着一把{wpn}和几个弹匣。船已经走了，货留了下来。", awardRate: 0.8, free: true },
  { event: "一个在夜之城很有名的武器商人突然降低了价格——{wpn}只卖{cost}欧。你不知道他为什么要清仓，但你不会错过这个机会。", awardRate: 0.9 },
  { event: "你在帮派交易中被卷入了一场混战——混乱中你捡起了一把掉在地上的{wpn}。它比你现在的武器好得多。", awardRate: 0.75, free: true },
  { event: "你帮一位老人修好了他坏掉的义眼。他感激地打开家里的一个密室——里面收藏了十几把武器。你选了一把{wpn}带走。", awardRate: 0.85, free: true },
  { event: "你在一家即将倒闭的武器店倒闭前最后一天抢购了{wpn}，花{cost}欧。店主看起来比你更难过。", awardRate: 0.9 },
  { event: "你在赛博空间里攻破了一个武器经销商的数据库，找到了一批'未入库'的武器位置。你去实地取回了{wpn}。", awardRate: 0.8, free: true },
  { event: "一次偶然的机会让你在废墟中发现了一个流浪佣兵的营地——他已经不在了，但{wpn}还在帐篷里等着下一个主人。", awardRate: 0.75, free: true },
  { event: "你用几瓶合成威士忌和一个出租车司机换了{wpn}——他说他再也不想碰这东西了。你检查了一下，状态意外地好。", awardRate: 0.7, free: true },
  { event: "你在一次黑客行动中截获了一批武器运输的信息——你半路截取了其中一把{wpn}。快递公司至今还在寻找'丢失'的包裹。", awardRate: 0.8, free: true },
  { event: "一个退役的NCPD警员在深夜的酒吧里喝醉了，把他的{wpn}以{cost}欧卖给了你。第二天他大概会后悔，但他已经不记得你的样子了。", awardRate: 0.85 },
  { event: "你在边境检查站的垃圾堆里找到了一把被没收后'忘记销毁'的{wpn}。系统漏洞的受益者又多了一个。", awardRate: 0.7, free: true },
  { event: "你在一家拍卖行里以{cost}欧拍得了一把{wpn}——拍卖师说它'来历不明但保存完好'。来历不明在夜之城反而是好事。", awardRate: 0.9 },
  { event: "你帮一个黑客破解了一个军用加密系统作为回报，他送了你一把从军用科技实验室'借来'的{wpn}。", awardRate: 0.85, free: true },
  { event: "一个武器走私犯在你的后备箱里偷偷放了一把{wpn}——他在被追捕时把它塞了进去。你发现后考虑了很久该怎么做。", awardRate: 0.7, free: true },
];

// ============================================================
// 义体获得事件模板 (30550-30599, 50条)
// ============================================================
const cyberwareEventTemplates = [
  // 义体医生安装 (1-12)
  { event: "你走进了沃森区一家口碑不错的义体医生诊所。经过两小时的手术，你的身体里多了{cyber}。疼痛持续了三天。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "你在歌舞伎町找到了传说中的义体医生'老维克'——他在你的身体上花了一整天安装了{cyber}。'别动，我在做精密调整。'", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一个地下义体医生在太平洲的废弃仓库里为你安装了{cyber}。手术条件很简陋，但你付的{cost}欧也只能买这种服务。", awardRate: 0.85, chrome: 1, humanity: -2 },
  { event: "你花{cost}欧在一家认证义体诊所做了{cyber}的安装手术。医生说手术非常成功，术后恢复期大约一周。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "你的义体医生朋友给你打了个折——{cost}欧就装上了{cyber}。'朋友价，别告诉别人。'", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一台自动化义体手术台为你安装了{cyber}——全程无人工干预。手术精确度很高，但缺乏人情的冰冷感让你有些不安。花了{cost}欧。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "你在一家街头义体改装店里花了{cost}欧安装了{cyber}。店主是个粗犷的中年人，手法却意外地细腻。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一个巡回义体医生在城市边缘的移动诊所为你安装了{cyber}——手术完成时他已经开始收拾工具准备去下一个地点了。花了{cost}欧。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "你在午夜时分进入了一个只有通过暗网邀请才能找到的义体实验室。里面安装了{cyber}。代价：{cost}欧和部分记忆。" },
  { event: "一位退休的军用科技外科医生在你的厨房里完成了{cyber}的安装——他声称这种'家庭手术'他做过上百次。你信了他的话。花了{cost}欧。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "你被紧急送进了一间义体修复中心——之前安装的旧义体出了故障。修复过程中你决定顺便升级为{cyber}，额外花了{cost}欧。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "一个来自日本的外科专家在夜之城短期执业——你花{cost}欧找他安装了{cyber}。手艺名不虚传。", awardRate: 0.85, chrome: 2, humanity: -1 },
  // 二手/走私/企业福利 (13-25)
  { event: "你在二手义体市场上淘到了一个品相尚可的{cyber}——前主人将它保养得很好。花{cost}欧买到后，你找了诊所安装。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一个帮派成员以极低的价格（{cost}欧）卖给了你一个'几乎全新'的{cyber}——他说它是从一个'不再需要它的人'身上拆下来的。", awardRate: 0.8, chrome: 1, humanity: -2 },
  { event: "作为企业员工，你享受了公司的义体补贴计划——{cyber}几乎由公司全额支付。个人只花了{cost}欧。这大概是你最大的员工福利了。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "一批从荒坂走私出来的义体在黑市上流通——你花了{cost}欧买到了{cyber}。安装后你发现它确实比民用版本先进。", awardRate: 0.85, chrome: 2, humanity: -1 },
  { event: "你在暗网上以{cost}欧拍到了一个军用级{cyber}——卖家声称是'退役军官的收藏品'。安装时义体医生看了直皱眉。", awardRate: 0.85, chrome: 2, humanity: -2 },
  { event: "一个义体回收站的老板让你看了他'珍藏'的{cyber}——从各种来源收集来的二手零件组装而成。花了{cost}欧，物美价廉。", awardRate: 0.8, chrome: 1, humanity: -1 },
  { event: "你在太平洲的黑市里遇到了一个专门做义体走私的女人——她以{cost}欧的价格卖给你一套{cyber}，附赠一份'不保证'的质量声明。", awardRate: 0.8, chrome: 1, humanity: -2 },
  { event: "企业升级了员工的标配义体——旧的{cyber}型号被替换下来。你通过内部渠道花了{cost}欧搞到了一个。虽然是旧型号，但对你来说足够好了。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一个在帮派里做'义体拆解工'的人向你推销了一批拆下来的{cyber}——花{cost}欧买了一个兼容型号。前主人的身份你选择不去想。", awardRate: 0.8, chrome: 1, humanity: -2 },
  { event: "军用科技的员工内部折扣让你以{cost}欧的价格拿到了{cyber}——这大概是你作为'内部人士'最大的好处之一。", awardRate: 0.9, chrome: 1, humanity: -1 },
  { event: "你在夜之城的废品回收站找到了一个损坏的{cyber}——花了{cost}欧请人修复后安装。虽然有些功能不稳定，但核心功能完好。", awardRate: 0.8, chrome: 1, humanity: -1 },
  { event: "一个地下义体实验室在清仓时甩卖了一批实验性{cyber}——你花了{cost}欧买了一个。安装后你的身体有些排异反应，但很快就适应了。", awardRate: 0.85, chrome: 2, humanity: -2 },
  { event: "你从一名战死的佣兵身上回收了{cyber}——用一个便携式拆解工具小心翼翼地取了下来。义体医生帮你安装时评价说'保养得很差但还能用'。", awardRate: 0.8, chrome: 1, humanity: -1, free: true },
  // 特殊/任务奖励 (26-40)
  { event: "你为一位神秘的客户完成了一次高危任务——报酬不是现金，而是一套全新的{cyber}。它在夜之城的任何商店都买不到。", awardRate: 0.9, chrome: 2, humanity: -1, free: true },
  { event: "一个义体黑客'升级'了你的身体——他在你的体内安装了{cyber}。你感到一阵刺痛，然后获得了前所未有的能力。", awardRate: 0.9, chrome: 2, humanity: -1, free: true },
  { event: "你在一次赛博空间探索中发现了一段义体设计蓝图——你把蓝图交给一个义体工匠，他用{cost}欧的成本为你打造了{cyber}。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "帮派老大将一套{cyber}赏给了你——'你证明了自己的价值，这是你的徽章。'安装仪式在帮派的全体成员面前进行。", awardRate: 0.85, chrome: 1, humanity: -2, free: true },
  { event: "你在一次任务中被俘虏，俘虏你的人给你安装了{cyber}——不是作为奖励，而是作为控制手段。你感到体内多了什么东西在悄悄运作。", awardRate: 0.9, chrome: 2, humanity: -2, free: true },
  { event: "一个奇怪的义体科学家在街头拦住了你——他自称在研究'人体增强极限'，免费为你安装了{cyber}。你不知道他为什么选中你。", awardRate: 0.85, chrome: 2, humanity: -1, free: true },
  { event: "你在一次深入企业大楼的行动中，意外发现了一个义体实验室——你顺手拿了一套{cyber}并带了出来。自行安装的过程很痛苦。", awardRate: 0.8, chrome: 1, humanity: -2, free: true },
  { event: "你的固定义体医生为你搞到了一批'内部渠道'的{cyber}——比市面产品更先进。你花了{cost}欧就安装了它。", awardRate: 0.9, chrome: 2, humanity: -1 },
  { event: "你参加了一场地下义体改装大赛——获胜奖品是一套顶级{cyber}。你在比赛中展示的改装技术让评委们印象深刻。", awardRate: 0.9, chrome: 2, humanity: -1, free: true },
  { event: "你从一位已故义体匠人的遗物中获得了他的代表作{cyber}——附赠的笔记里记录了详细的安装指南。", awardRate: 0.85, chrome: 1, humanity: -1, free: true },
  { event: "一次黑市的义体拍卖会上，你以{cost}欧的价格拍下了一套稀有的{cyber}——据说全世界只有不到100套。", awardRate: 0.9, chrome: 2, humanity: -1 },
  { event: "你在赛博空间里发现了一个隐藏的义体蓝图数据库——你花了三天时间打印和组装了一套{cyber}。成本只花了{cost}欧。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "一个走投无路的义体工程师以{cost}欧卖给你他的专利作品{cyber}——他说他需要钱来还债，但这套义体是他毕生的心血。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "你帮NCPD提供了一次关键线索，作为感谢，他们以'特殊渠道'为你提供了一套{cyber}。安装在一个秘密的警用设施里完成。", awardRate: 0.9, chrome: 1, humanity: -1, free: true },
  { event: "在一次任务中你意外获得了一套军用级{cyber}——它本来是要运往军用科技总部的，但你的'截胡'改变了它的命运。", awardRate: 0.85, chrome: 2, humanity: -2, free: true },
  // 更多义体获得 (41-50)
  { event: "你在沙漠中的一个废弃军事基地里发现了{cyber}——它们被保存在密封容器里，状态完好如新。安装后你感觉到身体发生了微妙的变化。", awardRate: 0.85, chrome: 2, humanity: -1, free: true },
  { event: "一个流浪的义体匠人在街头帮你用废旧零件拼装了一套{cyber}——虽然外观粗糙，但功能出人意料地好。你付了他{cost}欧。", awardRate: 0.8, chrome: 1, humanity: -1 },
  { event: "你在一次非法赌局的奖品中得到了{cyber}的安装券——你兑换了它，在一家高档义体诊所完成了安装。这大概是你赌博生涯中最幸运的一次。", awardRate: 0.9, chrome: 1, humanity: -1, free: true },
  { event: "你从一位老佣兵的遗物中获得了一套{cyber}——他的遗嘱上写着'交给下一个有需要的人'。安装后的不适感让你想起了他。", awardRate: 0.85, chrome: 1, humanity: -1, free: true },
  { event: "一个义体黑客远程入侵了你的神经接口，强行下载了{cyber}的驱动程序——你感到一阵剧痛，然后发现自己的身体多了一项新功能。", awardRate: 0.85, chrome: 2, humanity: -2, free: true },
  { event: "你在帮派的军械库里找到了一套{cyber}——它被锁在一个特殊的柜子里，上面贴着'高级会员专用'。你用技术手段绕过了锁。", awardRate: 0.8, chrome: 1, humanity: -1, free: true },
  { event: "你花{cost}欧在一家没有执照的义体店里安装了{cyber}——手术过程中停电了两次，但医生用手电筒完成了最后一步。", awardRate: 0.8, chrome: 1, humanity: -2 },
  { event: "一个神秘包裹寄到了你的住处——里面是{cyber}和一份手写的安装说明。没有寄件人信息。你犹豫了三天，最后决定安装它。", awardRate: 0.85, chrome: 2, humanity: -1, free: true },
  { event: "你在街头遇到了一个自称'人体增强师'的义体改装者——他花了{cost}欧和四个小时为你安装了{cyber}。效果超出预期。", awardRate: 0.85, chrome: 1, humanity: -1 },
  { event: "你在一次义体展览会上看中了一套{cyber}——但价格太高。不过你认识的人里有展览会的布展工人，他帮你搞到了一套'展示品'。", awardRate: 0.8, chrome: 1, humanity: -1, free: true },
];

// ============================================================
// 载具获得事件模板 (30600-30649, 50条)
// ============================================================
const vehicleEventTemplates = [
  // 购买 (1-12)
  { event: "你在车行里看中了一辆{veh}——经过一番讨价还价和贷款手续，你花{cost}欧把它开回了家。钥匙在手中的感觉真好。", awardRate: 0.7 },
  { event: "你在夜之城的二手汽车市场淘到了一辆{veh}——虽然有些划痕和异响，但价格只要{cost}欧。你决定自己动手修。", awardRate: 0.7 },
  { event: "你在网上找到了一辆{veh}的低价出售信息——卖家说他急需用钱。你花了{cost}欧买下，发现车况比描述的好。", awardRate: 0.7 },
  { event: "一个即将离开夜之城的人低价出售他的{veh}——'带走不了，卖了吧。'你花了{cost}欧接手了这辆车。", awardRate: 0.6 },
  { event: "你在圣多明哥的露天车市上以{cost}欧买到了一辆{veh}——卖家是个肌肉车爱好者，卖车是因为他买了新车。", awardRate: 0.7 },
  { event: "军用科技的员工内部购车计划让你以优惠价格获得了一辆{veh}——花了{cost}欧。虽然是最基础配置，但在夜之城有一辆车就够了。", awardRate: 0.7 },
  { event: "你在一次车行促销活动中以{cost}欧的价格买到了{veh}——附赠了免费保养和一份延保协议。你觉得自己赚到了。", awardRate: 0.7 },
  { event: "一个车行老板因为欠你人情，以{cost}欧的价格卖给你一辆{veh}——'这辆车放在这里很久了，你来给它找个好主人。'", awardRate: 0.7 },
  { event: "你在帮派控制的改装车店里以{cost}欧买了一辆{veh}——车已经做了大量非法改装，你假装不知道。", awardRate: 0.6 },
  { event: "你花了{cost}欧在一家拍卖行拍到了一辆{veh}——前车主是个富豪，这辆车只是他车库里最不起眼的一辆。", awardRate: 0.7 },
  { event: "你通过暗网经纪人以{cost}欧的价格买了一辆{veh}——据说它是某个犯罪集团被查抄后的'流失品'。", awardRate: 0.6 },
  { event: "你在科珀广场的高端车行里签了一份分期协议，每月还款把你压得喘不过气。但你终于开上了{veh}。", awardRate: 0.7 },
  // 偷车/赢取/特殊 (13-25)
  { event: "你在一次大胆的行动中'借'走了一辆停在后巷的{veh}——车主大概需要几个小时才会发现。你把车牌换了之后它就是你的了。", awardRate: 0.6, free: true },
  { event: "你在一场地下赛车比赛中赢了冠军——奖品是一辆{veh}。你站在领奖台上时还在想这不是做梦吧。", awardRate: 0.7, free: true },
  { event: "你在一个报废车辆处理场里发现了一辆半毁的{veh}——花了{cost}欧买下零件并花了一周时间修复。虽然有些地方不完美，但它能跑了。", awardRate: 0.6 },
  { event: "帮派老大在派对上宣布'你现在是核心成员了'——作为入伙礼物，他把你领到车库，里面停着一辆{veh}。'你的。'", awardRate: 0.7, free: true },
  { event: "你在一场赌局中赢了一辆{veh}——赌注只是一辆旧摩托。对面的家伙显然高估了自己的运气。", awardRate: 0.6, free: true },
  { event: "你的叔叔去世后留下了一辆{veh}——它在车库里积了半年的灰尘。你打开车门坐进去，闻到了旧皮革和机油的气味。", awardRate: 0.7, free: true },
  { event: "你在一次任务中为企业客户护送了一批货物——报酬除了现金外还有一辆{veh}。'企业不差这点钱。'客户说。", awardRate: 0.7, free: true },
  { event: "你花了{cost}欧从NCPD的报废车拍卖会上买到了一辆{veh}——警方使用过的车，经历了各种场面，但发动机还在。", awardRate: 0.6 },
  { event: "你在沙漠中发现了一辆被遗弃的{veh}——它半埋在沙中，但车载系统还能启动。你花了{cost}欧请人把它拖了出来。", awardRate: 0.6, free: true },
  { event: "你在赛博空间里入侵了一家租车公司的系统，将一辆{veh}的所有权信息'修正'成了你的名字。技术果然是第一生产力。", awardRate: 0.5, free: true },
  { event: "你在一场街头赛车中被对手'赌输了'——他输得心服口服，把{veh}的钥匙扔给你后转身走了。", awardRate: 0.6, free: true },
  { event: "一个地下黑客帮你修改了一辆{veh}的电子序列号——你花了{cost}欧买下了这辆'已被注销'的车。现在它有了新的身份。", awardRate: 0.6 },
  { event: "你在边境的高速公路上发现了一辆出了事故的{veh}——车主已经离开了。你花了{cost}欧把它拖回去修好。", awardRate: 0.6, free: true },
  // 企业配车/继承/更多 (26-50)
  { event: "公司为你配备了一辆{veh}——作为你新职位的配套福利。虽然车辆归属权是公司的，但你有无限使用权。", awardRate: 0.7, free: true },
  { event: "你在一次抢劫中被分配到了驾驶{veh}逃跑的任务——事后同伙说'你留着吧，这车会暴露我们'。你不客气地收下了。", awardRate: 0.6, free: true },
  { event: "你在网上的一家虚拟二手车交易平台以{cost}欧买到了{veh}——实际车况和描述略有出入，但总体可接受。", awardRate: 0.7 },
  { event: "你在科罗拉多州的一次旅行中发现了一个二手车市场——花{cost}欧买到了一辆{veh}并一路开回了夜之城。", awardRate: 0.7 },
  { event: "你的一个客户是汽车收藏家——他用一辆{veh}抵扣了欠你的佣金。'这辆车对我来说太多了。'他说。", awardRate: 0.7, free: true },
  { event: "你在一次帮派火拼后发现了一辆无人认领的{veh}——钥匙还在点火器上。你深吸一口气，启动了引擎。", awardRate: 0.5, free: true },
  { event: "你帮一个汽车改装店老板解决了他的'税务问题'——作为报酬，他在店里随便你挑。你选了{veh}。", awardRate: 0.7, free: true },
  { event: "你花{cost}欧买了一个报废的{veh}和一堆配件——用了一个月时间在车库里亲手组装。虽然是拼装车，但每一颗螺丝都是你拧的。", awardRate: 0.6 },
  { event: "你在太平洲的一个渔船码头上发现了一辆{veh}——它在码头上放了很久，船主似乎已经不再需要它了。你和船主达成了交易。", awardRate: 0.6, free: true },
  { event: "你在一次非常规的任务中通过中间人获得了一辆{veh}作为报酬——客户说'现金太容易被追踪了'。", awardRate: 0.7, free: true },
  { event: "你的一个女性朋友要搬家，她有一辆{veh}不知道怎么处理——'你拿去吧，给我留个好印象就行。'", awardRate: 0.6, free: true },
  { event: "你在街头帮助了一个出了车祸的人——他受了轻伤，他的{veh}却还能开。为了感谢你，他让你先开走，他等拖车。然后他再也没联系你。", awardRate: 0.5, free: true },
  { event: "你在一个地下停车场里发现了一辆被遗弃的{veh}——仪表盘上显示'低电量'。你花了{cost}欧更换了电池，它重新启动了。", awardRate: 0.6, free: true },
  { event: "你在一场公司抽奖活动中中了大奖——一辆{veh}。HR通知你的时候你差点从椅子上跳起来。", awardRate: 0.7, free: true },
  { event: "你在街头的一场即兴赛车中被一个富二代挑战——他输了，很不情愿地把{veh}的钥匙交给了你。", awardRate: 0.6, free: true },
  { event: "你花{cost}欧从一个破产的物流公司那里买了一批拍卖车中的一辆{veh}——虽然是工作用车，但你很快就把它改成了自己的风格。", awardRate: 0.7 },
  { event: "你在赛博空间里帮一个黑客完成了入侵任务——他送你的报酬不是现金，而是他入侵的租车公司的数据库里一辆{veh}的使用权。", awardRate: 0.6, free: true },
  { event: "你用旧摩托和{cost}欧的补差价在一家二手车行换购了一辆{veh}——虽然被坑了一些，但你终于不用骑摩托了。", awardRate: 0.7 },
  { event: "你在夜之城的街道上发现了一辆没有上锁的{veh}——车主在旁边便利店买东西。你犹豫了三秒，然后开走了它。", awardRate: 0.5, free: true },
  { event: "你在一家回收站花了{cost}欧买到了一辆被水淹过的{veh}——花了两天时间烘干电路后它竟然还能用。", awardRate: 0.6 },
  { event: "你帮一个汽车设计师做了一个黑客项目，他作为回报赠送了一辆他设计的概念版{veh}。全世界只有三辆。", awardRate: 0.7, free: true },
  { event: "你在一个地下赛车论坛上发现有人以{cost}欧出售一辆经过重度改装的{veh}——引擎声音低沉有力，像一头苏醒的野兽。", awardRate: 0.7 },
  { event: "你在帮派总部完成了升级仪式——帮派奖励了你一辆{veh}，引擎上喷涂着帮派标志。从现在起你就是'有车一族'了。", awardRate: 0.7, free: true },
  { event: "你在一个被遗忘的车库里发现了一辆尘封的{veh}——它的状态出乎意料地好。花{cost}欧做了保养后，它像新车一样运转。", awardRate: 0.6, free: true },
  { event: "你的收入终于达到了一个里程碑——你走进车行，大手一挥买下了{veh}。花了{cost}欧，但你值得。", awardRate: 0.7 },
  { event: "你通过赛博空间入侵了一家车辆注册机构，把一辆被没收的{veh}的注册信息改成了你的名字。零成本，高风险。", awardRate: 0.5, free: true },
  { event: "你在街头捡到了一把车钥匙——按下遥控器后，不远处的一辆{veh}闪了两下灯。你看了看四周，没有人注意到你。", awardRate: 0.5, free: true },
];

// ============================================================
// 特殊装备获得事件模板 (30650-30699, 50条)
// ============================================================
const specialEventTemplates = [
  // 军用/传说 (1-15)
  { event: "你在一个被遗忘的军火库中发现了传说中的{wpn}——据说它曾在夜之城的一次大战中决定了胜负。", awardRate: 0.7, style: 2, free: true },
  { event: "你从一名退役特种兵那里花{cost}欧买到了一件军用级别的特殊装备——{wpn}。他说'这东西在正规商店里买不到的'。", awardRate: 0.8, style: 2 },
  { event: "一个武器收藏家去世后，他的家人公开拍卖他的收藏。你花了{cost}欧拍到了一把据说'夜之城只有三把'的{wpn}。", awardRate: 0.8, style: 2 },
  { event: "你在沙漠中探索废弃军事设施时，在一个上锁的保险箱里发现了一件原型武器{wpn}。标签上写着'实验品-禁止流出'。", awardRate: 0.7, style: 2, free: true },
  { event: "你帮一个老佣兵处理了他的武器收藏——他送给你{wpn}作为感谢。'年轻人，这把武器见证过很多事。好好保管。'", awardRate: 0.8, style: 1, free: true },
  { event: "你在暗网的最高级拍卖会上以{cost}欧拍得了一件传说级装备{wpn}——据说它曾经属于一个传奇佣兵。", awardRate: 0.8, style: 2 },
  { event: "一次夜之城的大规模骚乱中，军用科技的安全仓库被攻破——你趁乱获得了一件{wpn}。它的型号你从未在任何公开资料中见过。", awardRate: 0.7, style: 2, free: true },
  { event: "你在帮派交火后的废墟中翻出了{wpn}——据传它是某个传奇帮派领袖的贴身武器。上面的签名已经模糊了。", awardRate: 0.7, style: 2, free: true },
  { event: "你在赛博空间的深层区域发现了一个武器设计者留下的数字遗产——蓝图+材料，你花了{cost}欧请人打造出了{wpn}。", awardRate: 0.8, style: 2 },
  { event: "一个在夜之城被称为'军火之神'的人物决定金盆洗手——他在最后一场拍卖中出售了他的私人藏品。你花{cost}欧买到了{wpn}。", awardRate: 0.8, style: 2 },
  { event: "你在执行一次护送任务时，被护送的神秘箱子在混乱中打开了——里面是一件原型机{wpn}。你把它'收入'了自己的装备库。", awardRate: 0.7, style: 2, free: true },
  { event: "你在废墟中发现了一辆独特改装的{veh}——它的引擎经过军用级改造，速度和耐用性远超普通型号。花了{cost}欧修复。", awardRate: 0.6, style: 2 },
  { event: "一个来自日本的武器匠人专程来到夜之城，为你打造了{wpn}——花了{cost}欧和三个月的等待时间。每一寸都经过精心锻造。", awardRate: 0.9, style: 2 },
  { event: "你在荒坂塔的一次秘密潜入任务中，从一个高管办公室的暗格里偷出了{wpn}——它是用特殊材料制作的，在黑市上价值连城。", awardRate: 0.7, style: 2, free: true },
  { event: "你在夜之城的传说中发现了一条'宝藏线索'——追踪线索后在地下停车场的一个废弃储物柜里找到了{wpn}。传说是真的。", awardRate: 0.7, style: 2, free: true },
  // 唯一物品/原型机/特殊 (16-35)
  { event: "你获得了一套独一无二的原型义体{cyber}——它由一位天才义体工程师设计，全世界只有这一套。安装后的感觉难以言喻。", awardRate: 0.8, chrome: 2, humanity: -1, style: 2, free: true },
  { event: "你在暗网的'传奇物品'板块上以{cost}欧买到了一件据说'仅此一件'的{wpn}。鉴定结果表明它的确是孤品。", awardRate: 0.8, style: 2 },
  { event: "一个秘密组织在夜之城招募新成员——入伙福利是一套顶级装备{wpn}。你犹豫了很久后接受了。", awardRate: 0.8, style: 1, free: true },
  { event: "你从一名企业叛逃者手中获得了{wpn}——它是企业实验室的绝密产品。叛逃者说'用它做你想做的事'。", awardRate: 0.7, style: 2, free: true },
  { event: "你在一次野外探险中，在一座废弃的军用研究设施里发现了一件特殊装备{wpn}。它的功能让你目瞪口呆。", awardRate: 0.7, style: 2, free: true },
  { event: "一个武器设计师在临终前将他毕生心血之作{wpn}托付给了你——'这是超越时代的作品，交给值得拥有它的人。'", awardRate: 0.8, style: 2, free: true },
  { event: "你在一次地下拍卖会上以{cost}欧的价格获得了一件来自'旧网时代'的特殊装备{wpn}——据说它有着不为人知的历史。", awardRate: 0.8, style: 2 },
  { event: "你帮一位赛博空间大牛完成了他的研究项目，他奖励你了一件数字武器{wpn}——它能以独特的方式影响赛博空间中的实体。", awardRate: 0.8, style: 2, free: true },
  { event: "你从一位死去黑客的遗物中获得了一件名为{wpn}的特殊装置——它看起来不起眼，但功能远超表面。", awardRate: 0.7, style: 1, free: true },
  { event: "你在夜之城的黑市中发现了一件'来路不明'的{wpn}——卖家只知道它是从某个大企业的秘密项目中流出来的。花了{cost}欧。", awardRate: 0.8, style: 2 },
  { event: "一个从未来...或者说自称从未来回来的人，给了你一件{wpn}。'你会需要它的。'他说。然后他就消失了。", awardRate: 0.7, style: 2, free: true },
  { event: "你在帮派冲突中缴获了一件帮派首领的专属装备{wpn}——它上面刻着帮派标志和首领的编号。这是权力的象征。", awardRate: 0.7, style: 1, free: true },
  { event: "你在一次政府秘密仓库的泄露事件中获得了{wpn}——它是NCPD从未对外公开的特殊装备。来源你不打算深究。", awardRate: 0.7, style: 2, free: true },
  { event: "你花了{cost}欧和一个游荡在夜之城的'旅行商人'交换了一件{wpn}——他似乎什么都有，也什么都不在乎。", awardRate: 0.8, style: 1 },
  { event: "你在赛博空间的一个隐藏区域发现了一件数字武器{wpn}的蓝图——你花了{cost}欧的材料费3D打印出来。它是唯一一件物理副本。", awardRate: 0.8, style: 2 },
  { event: "你从一位退休的'夜之城传奇'那里获得了一套传说级{cyber}——他说'我老了，不需要这些了，但你会用得上的'。", awardRate: 0.8, chrome: 2, humanity: -1, style: 2, free: true },
  { event: "你在一次穿越战区的任务中捡到了一件军用级别的特殊装备{wpn}——它的型号在所有公开资料中都找不到。", awardRate: 0.7, style: 2, free: true },
  { event: "你在夜之城的地下格斗场中赢得了冠军——奖励是一件传说级装备{wpn}。观众席上的赌徒们为你的胜利欢呼。", awardRate: 0.8, style: 2, free: true },
  { event: "一个自称来自'旧美国'的收藏家在夜之城办了一场私人拍卖——你花了{cost}欧买到了一件战前收藏品{wpn}。", awardRate: 0.8, style: 2 },
  { event: "你在一次意外中激活了{wpn}——它原本是一件不起眼的物品，但在特定条件下展现了令人震惊的隐藏功能。", awardRate: 0.7, style: 2, free: true },
  // 混合奖励特殊 (36-50)
  { event: "你完成了一次传奇级委托——中间人感激不已，除了现金外还送了你{wpn}和一张通往{veh}的提车单。大丰收的一天。", awardRate: 0.8, style: 2, free: true, dualAward: true },
  { event: "你在一场帮派战争中帮助了胜利的一方——作为奖励，你获得了{wpn}和{cyber}。你在战争中找到了自己的位置。", awardRate: 0.8, chrome: 1, humanity: -1, style: 1, free: true },
  { event: "你帮一个亿万富翁解决了他的'私人问题'——报酬是{wpn}加一辆{veh}。他说'这只是零花钱买的'。", awardRate: 0.8, style: 2, free: true, dualAward: true },
  { event: "你在一次深入企业大楼的任务中发现了武器库和车库——你'借用'了{wpn}和一辆{veh}。企业的损失，你的收获。", awardRate: 0.7, style: 2, free: true },
  { event: "你在沙漠中的废弃军事基地里发现了一个完整的军火库——{wpn}和{cyber}同时收入囊中。你感觉自己像是中了大奖。", awardRate: 0.8, chrome: 1, humanity: -1, style: 1, free: true },
  { event: "你帮一个地下实验室解决了安全问题——他们用实验性产品{cyber}和{wpn}作为报酬支付给你。这些东西市面上绝对买不到。", awardRate: 0.8, chrome: 2, humanity: -1, style: 2, free: true },
  { event: "你在夜之城的传说中追踪到了'暗影商人'的藏宝地点——箱子里有{wpn}和{cyber}。传说果然是真的。", awardRate: 0.8, chrome: 1, humanity: -1, style: 2, free: true },
  { event: "你在一次大型黑客行动中攻破了一个军火商的加密数据库——你远程'订购'了{wpn}，快递地址写的是你的安全屋。", awardRate: 0.7, style: 1, free: true },
  { event: "你的团队在一次高难度任务中大获全胜——战利品分配中你拿到了{wpn}。队友们羡慕地看着你。", awardRate: 0.8, style: 1, free: true },
  { event: "你在一个帮派领袖的私人收藏中发现了一件顶级{wpn}——它的序列号表明它曾经属于荒坂的一位高级执行官。", awardRate: 0.7, style: 2, free: true },
  { event: "你在赛博空间里赢得了一场全服大赛——奖励是实物{wpn}。组委会用加密快递把奖品送到了你手上。", awardRate: 0.8, style: 1, free: true },
  { event: "你从一位传奇佣兵的墓碑下取走了一个密封盒——里面是{wpn}。盒子上写着'传承于此，望善待之'。", awardRate: 0.7, style: 2, free: true },
  { event: "你在一个秘密实验室的废墟中发现了一套原型装备{cyber}——它能让你的神经系统与武器系统直接对接。安装过程极其痛苦。", awardRate: 0.8, chrome: 2, humanity: -2, style: 2, free: true },
  { event: "你完成了一次不可能的任务——雇主欣喜若狂，给了你超出约定五倍的报酬，外加一件传说级{wpn}。", awardRate: 0.8, style: 2, free: true },
  { event: "你在夜之城的天台上看日出时，发现了一个用密码锁锁住的箱子。你破解了密码——里面是{wpn}和一张写着'给有缘人'的字条。", awardRate: 0.7, style: 1, free: true },
];

// ============================================================
// 主函数 - 生成所有装备事件
// ============================================================

function getItemName(id, pool) {
  if (!id) return '未知装备';
  if (id.startsWith('veh_')) {
    return vehicles[id]?.name || id;
  }
  return items[id]?.name || id;
}

function generateWeaponEvents() {
  const events = {};
  let id = 30500;
  const templates = weaponEventTemplates;

  for (let i = 0; i < 50 && id <= 30549; i++, id++) {
    const tpl = templates[i % templates.length];
    const wpnId = pick(wpnIds);
    const wpnName = getItemName(wpnId);
    let eventText = tpl.event.replace(/\{wpn\}/g, wpnName);

    const cost = tpl.free ? 0 : randInt(2, 6);
    if (cost > 0) {
      eventText = eventText.replace(/\{cost\}/g, `${cost * 1000}`);
    } else {
      eventText = eventText.replace(/\{cost\}/g, '0');
    }

    const ev = {
      id,
      event: eventText,
      type: 'gear',
      repeatable: false,
      effect: { STYLE: 1 },
    };

    // 给物品奖励
    if (maybe(tpl.awardRate)) {
      ev.itemAward = wpnId;
    }

    // 购买类花欧
    if (!tpl.free && cost > 0) {
      ev.effect.EDDIES = -cost;
    }

    events[String(id)] = ev;
  }

  console.log(`武器获得事件: ${Object.keys(events).length}条`);
  return events;
}

function generateCyberwareEvents() {
  const events = {};
  let id = 30550;
  const templates = cyberwareEventTemplates;

  for (let i = 0; i < 50 && id <= 30599; i++, id++) {
    const tpl = templates[i % templates.length];
    const cyberId = pick(impIds);
    const cyberName = getItemName(cyberId);
    let eventText = tpl.event.replace(/\{cyber\}/g, cyberName);

    const cost = tpl.free ? 0 : randInt(2, 6);
    if (cost > 0) {
      eventText = eventText.replace(/\{cost\}/g, `${cost * 1000}`);
    } else {
      eventText = eventText.replace(/\{cost\}/g, '0');
    }

    const effect = {};
    effect.CHROME = tpl.chrome || randInt(1, 2);
    effect.HUMANITY = tpl.humanity || -randInt(1, 2);
    if (!tpl.free && cost > 0) {
      effect.EDDIES = -cost;
    }

    const ev = {
      id,
      event: eventText,
      type: 'gear',
      repeatable: false,
      effect,
    };

    if (maybe(tpl.awardRate)) {
      ev.itemAward = cyberId;
    }

    events[String(id)] = ev;
  }

  console.log(`义体获得事件: ${Object.keys(events).length}条`);
  return events;
}

function generateVehicleEvents() {
  const events = {};
  let id = 30600;
  const templates = vehicleEventTemplates;

  for (let i = 0; i < 50 && id <= 30649; i++, id++) {
    const tpl = templates[i % templates.length];
    const vehId = pick(vehIds);
    const vehName = getItemName(vehId);
    let eventText = tpl.event.replace(/\{veh\}/g, vehName);

    const cost = tpl.free ? 0 : randInt(2, 6);
    if (cost > 0) {
      eventText = eventText.replace(/\{cost\}/g, `${cost * 1000}`);
    } else {
      eventText = eventText.replace(/\{cost\}/g, '0');
    }

    const effect = {};
    if (maybe(0.7)) {
      effect.STYLE = randInt(1, 2);
    }
    if (!tpl.free && cost > 0) {
      effect.EDDIES = -cost;
    }

    const ev = {
      id,
      event: eventText,
      type: 'gear',
      repeatable: false,
      effect,
    };

    if (maybe(tpl.awardRate)) {
      ev.vehicleAward = vehId;
    }

    events[String(id)] = ev;
  }

  console.log(`载具获得事件: ${Object.keys(events).length}条`);
  return events;
}

function generateSpecialEvents() {
  const events = {};
  let id = 30650;
  const templates = specialEventTemplates;

  for (let i = 0; i < 50 && id <= 30699; i++, id++) {
    const tpl = templates[i % templates.length];

    // 随机决定给什么类型的装备
    let eventText = tpl.event;
    const awardType = randInt(0, 2); // 0=weapon, 1=cyber, 2=vehicle

    if (awardType === 0) {
      const wpnId = pick(wpnIds);
      eventText = eventText.replace(/\{wpn\}/g, getItemName(wpnId));
      // 给itemAward
      if (maybe(tpl.awardRate)) {
        // will set below
      }
    } else if (awardType === 1) {
      const cyberId = pick(impIds);
      eventText = eventText.replace(/\{cyber\}/g, getItemName(cyberId));
      // 给itemAward
      if (maybe(tpl.awardRate)) {
        // will set below
      }
    } else {
      const vehId = pick(vehIds);
      eventText = eventText.replace(/\{veh\}/g, getItemName(vehId));
    }

    const cost = tpl.free ? 0 : randInt(2, 6);
    if (cost > 0) {
      eventText = eventText.replace(/\{cost\}/g, `${cost * 1000}`);
    } else {
      eventText = eventText.replace(/\{cost\}/g, '0');
    }

    const effect = {};
    effect.STYLE = tpl.style || randInt(1, 2);
    if (tpl.chrome) effect.CHROME = tpl.chrome;
    if (tpl.humanity) effect.HUMANITY = tpl.humanity;
    if (!tpl.free && cost > 0) effect.EDDIES = -cost;

    const ev = {
      id,
      event: eventText,
      type: 'gear',
      repeatable: false,
      effect,
    };

    // 添加奖励
    if (maybe(tpl.awardRate)) {
      if (awardType === 0) {
        ev.itemAward = pick(wpnIds);
      } else if (awardType === 1) {
        ev.itemAward = pick(impIds);
      } else {
        ev.vehicleAward = pick(vehIds);
      }
    }

    // 双奖励事件
    if (tpl.dualAward && maybe(0.5)) {
      // 如果已经有itemAward，添加vehicleAward，反之亦然
      if (ev.vehicleAward && !ev.itemAward) {
        ev.itemAward = pick(wpnIds);
      } else if (ev.itemAward && !ev.vehicleAward) {
        ev.vehicleAward = pick(vehIds);
      } else if (!ev.itemAward && !ev.vehicleAward) {
        ev.itemAward = pick(wpnIds);
      }
    }

    events[String(id)] = ev;
  }

  console.log(`特殊装备获得事件: ${Object.keys(events).length}条`);
  return events;
}

function generate() {
  console.log('===== 装备获得事件生成器 =====\n');

  const weaponEvents = generateWeaponEvents();
  const cyberEvents = generateCyberwareEvents();
  const vehicleEvents = generateVehicleEvents();
  const specialEvents = generateSpecialEvents();

  const allGearEvents = {
    ...weaponEvents,
    ...cyberEvents,
    ...vehicleEvents,
    ...specialEvents,
  };

  const total = Object.keys(allGearEvents).length;
  console.log(`\n总计生成: ${total}条装备获得事件`);

  if (total !== 200) {
    console.warn(`警告: 期望200条，实际${total}条`);
  }

  return allGearEvents;
}

const gearEvents = generate();

// 合并到已有文件（如果infancy已经写入）
const outputPath = join(DATA_DIR, 'events-infancy-gear.json');
let existingData = {};
try {
  existingData = JSON.parse(readFileSync(outputPath, 'utf-8'));
} catch (e) {
  // 文件不存在
}

const mergedData = { ...existingData, ...gearEvents };
writeFileSync(outputPath, JSON.stringify(mergedData, null, 2), 'utf-8');
console.log(`\n已写入: ${outputPath}`);
console.log(`文件总事件数: ${Object.keys(mergedData).length}`);
