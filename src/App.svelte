<script>

	//movable er laaang div med alle sections horisontalt
	let movable
	//position er den section vi ser nå
	let position = 3
	//$: betyr at alt inni kjører når noe forandrer sig
	$: {
		//når DOM er klar
		if(movable){
			//regn ut presis bredde på hver section
			let w = movable.getBoundingClientRect().width/7
			//flytt sections når position variablen endres
			movable.style.transform= `translateX(-${position*w}px)`
		}
	}
	//flyttefunksjon
	const move = (dir) => {
		position = position + dir
		//ikke for langt...
		if(position > 6 && dir > 0)position = 6
		if(position < 0 && dir < 0)position = 0
	}
</script>

<main>
	<div class='movable' bind:this={movable}>	
		<section><h1>page 1</h1></section>
		<section><h1>page 2</h1></section>
		<section><h1>page 3</h1></section>
		<section>
			<div>			
				<h1>frontpage</h1>
				<div class='doors'>
					<div on:click={() => move(-1)} class='door'>go left</div>
					<div on:click={() => move(1)} class='door'>go right</div>
				</div>
			</div>
		</section>
		<section><h1>page 4</h1></section>
		<section><h1>page 5</h1></section>
		<section><h1>page 6</h1></section>
	</div>
	{#if position!=3}
	<div class='abs'>
		<div on:click={() => move(-1)} class='arrow'>←</div>
		<div on:click={() => move(1)} class='arrow'>→</div>
	</div>
	{/if}
</main>



<style>
	main {
		width:100vw;
		height:100vh;
		overflow:hidden;

	}
	.movable{
		display:grid;
		width:700vw;
		grid-auto-flow: column;
		place-items: center;
		transition:.6s ease;
	}
	section{
		width:100vw;
		height:100vh;
		display:grid;
		place-items:center;
	}
	section:nth-last-of-type(even){
		background:#111;
		color:white;
	}
	.doors{
		display:grid;
		grid-auto-flow: column;
		place-items: center;
		justify-content: space-around;
	}
	.door{
		border:1px solid lightgray;
		width:100px;
		padding:.5rem;
		text-align: center;
		cursor: pointer;
	}
	.abs{
		position:absolute;
		bottom:0;
		left:0;
		height:16vh;
		width:100vw;
		display:grid;
		grid-auto-flow: column;
		place-items: center;
		justify-content: space-between;
	}
	.arrow{
		border:1px solid gray;
		color:gray;
		width:40px;
		height:40px;
		display:grid;
		place-items:center;
		cursor: pointer;
		border-radius: 50%;
		padding:.5rem;
		margin:2rem;
	}
	h1 {
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}
	:global(body, html){
		margin:0;
		padding:0;
		scroll-behavior: smooth;
	}
</style>