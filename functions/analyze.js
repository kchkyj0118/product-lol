// functions/analyze.js 내부의 윗부분에 추가
const { summonerName, tagLine } = await request.json();

// 서버에서도 혹시 모를 #이나 공백을 한 번 더 제거
const cleanTag = tagLine.replace('#', '').trim();

const accReq = await fetch(`https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${summonerName}/${cleanTag}?api_key=${env.RIOT_API_KEY}`);