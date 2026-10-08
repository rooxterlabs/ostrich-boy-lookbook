import crackedEggImg from '../assets/cracked-egg.png'

export function MovieInfoPage() {
  return (
    <main className="page-shell movie-info-page" id="movie-info-page">
      <img
        src={crackedEggImg}
        alt="Cracked egg"
        className="movie-info-egg"
        width={344}
        height={454}
        draggable={false}
      />
      <h1 className="movie-info-title">This page is under construction</h1>
    </main>
  )
}
