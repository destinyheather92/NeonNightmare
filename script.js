    // Shared DOM references for the page interactions.
    const body = document.body;
    const corruptButton = document.querySelector("#corruptButton");
    const modeToggle = document.querySelector("#modeToggle");
    const quoteButton = document.querySelector("#quoteButton");
    const quoteOutput = document.querySelector("#quoteOutput");
    const pitCount = document.querySelector("#pitCount");
    const fearMeter = document.querySelector("#fearMeter");
    const nightmareCards = document.querySelectorAll(".nightmare-card");
    const trackItems = document.querySelectorAll("#trackList li");
    const gameArena = document.querySelector("#gameArena");
    const playerEl = document.querySelector("#player");
    const sigilEl = document.querySelector("#sigil");
    const gameOverlay = document.querySelector("#gameOverlay");
    const startGameButton = document.querySelector("#startGameButton");
    const scoreReadout = document.querySelector("#scoreReadout");
    const healthReadout = document.querySelector("#healthReadout");
    const levelReadout = document.querySelector("#levelReadout");
    const objectiveReadout = document.querySelector("#objectiveReadout");
    const dpadButtons = document.querySelectorAll(".dpad button");
    const audioStatus = document.querySelector("#audioStatus");
    const stopAudioButton = document.querySelector("#stopAudioButton");
    const slasherTiles = document.querySelectorAll(".slasher-tile");

    // Random warnings rotate through the VHS-style quote machine.
    const warnings = [
      "Do not pause the tape during the solo.",
      "Something in the static has your backstage pass.",
      "The exit sign is only decorative.",
      "Tonight's encore requires a pulse.",
      "If the skull smiles, smile back slowly.",
      "Your shadow just requested a song.",
      "The fog machine is not plugged in.",
      "Rewind three times to forget what saw you."
    ];

    let pitEnergy = 0;
    let lastWarning = 0;
    let animationFrame = 0;
    let lastFrameTime = 0;
    let gameRunning = false;
    let score = 0;
    let health = 100;
    let wave = 1;
    let collected = 0;
    let hitCooldown = 0;

    const keys = new Set();
    const player = { x: 50, y: 50, speed: 42 };
    const sigil = { x: 70, y: 40 };
    const enemies = [];
    let audioContext;
    let activeAudioNodes = [];
    let activeAudioTimers = [];
    let lastScreamTime = 0;

    const trackSongs = [
      { bpm: 154, root: 82, riff: [1, 1, 1.5, 1, 0.75, 1, 2, 1], lead: [2, 2.25, 1.5, 1, 3, 2, 1.5, 0.75], mood: "Static Ripper" },
      { bpm: 132, root: 98, riff: [1, 1, 0.67, 1, 1.5, 1, 0.75, 0.5], lead: [1.5, 1.33, 2, 1.5, 2.25, 2, 1.33, 1], mood: "Feedback Moon" },
      { bpm: 145, root: 110, riff: [1, 0.75, 1, 1.5, 1.33, 1, 2, 0.75], lead: [2, 1.5, 2.25, 3, 2.25, 1.5, 1.33, 1], mood: "Drive-In Tape" },
      { bpm: 168, root: 73, riff: [1, 1.26, 1.5, 1.26, 1, 0.75, 1, 0.5], lead: [2, 2.52, 3, 2.52, 2, 1.5, 1.26, 1], mood: "Six String Chase" },
      { bpm: 118, root: 123, riff: [1, 1.2, 1.33, 1.6, 1.33, 1.2, 1, 0.67], lead: [2, 2.4, 2.66, 3.2, 2.66, 2.4, 2, 1.33], mood: "Dust Solo" },
      { bpm: 104, root: 65, riff: [1, 1.26, 1.5, 1.68, 1.5, 1.26, 1, 0.75], lead: [2, 2.52, 3, 3.36, 3, 2.52, 2, 1.5], mood: "Funeral March" },
      { bpm: 126, root: 92, riff: [1, 1.2, 1.5, 1.2, 1, 0.8, 1.5, 2], lead: [1.5, 2, 2.4, 3, 2.4, 2, 1.5, 1.2], mood: "Night Drive" },
      { bpm: 176, root: 55, riff: [1, 1.33, 1.5, 2, 2.66, 2, 1.5, 1], lead: [2, 2.66, 3, 4, 5.33, 4, 3, 2], mood: "World End Encore" }
    ];

    // Build the fear meter bars with JavaScript so the meter can animate statefully.
    for (let index = 0; index < 12; index += 1) {
      const bar = document.createElement("span");
      fearMeter.appendChild(bar);
    }

    function randomWarning() {
      let next = Math.floor(Math.random() * warnings.length);
      if (next === lastWarning) {
        next = (next + 1) % warnings.length;
      }
      lastWarning = next;
      quoteOutput.textContent = warnings[next];
      quoteOutput.classList.remove("glitch");
      void quoteOutput.offsetWidth;
      quoteOutput.classList.add("glitch");
      quoteOutput.dataset.text = warnings[next];
    }

    function updateFearMeter() {
      const activeBars = Math.ceil((pitEnergy / 100) * 12);
      fearMeter.querySelectorAll("span").forEach((bar, index) => {
        bar.classList.toggle("active", index < activeBars);
      });
      pitCount.textContent = `Pit energy: ${pitEnergy}%`;
    }

    function getAudioContext() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
      return audioContext;
    }

    function rememberAudioNode(node) {
      activeAudioNodes.push(node);
      return node;
    }

    function stopSetlistAudio() {
      activeAudioTimers.forEach((timer) => clearTimeout(timer));
      activeAudioTimers = [];
      activeAudioNodes.forEach((node) => {
        try {
          if (typeof node.stop === "function") {
            node.stop();
          }
          if (typeof node.disconnect === "function") {
            node.disconnect();
          }
        } catch (error) {
          // Stopping an already-finished oscillator is harmless.
        }
      });
      activeAudioNodes = [];
      audioStatus.textContent = "Audio stopped";
    }

    function playNoiseBurst(context, start, duration, volume) {
      const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / data.length);
      }

      const source = rememberAudioNode(context.createBufferSource());
      const filter = rememberAudioNode(context.createBiquadFilter());
      const gain = rememberAudioNode(context.createGain());
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(900 + Math.random() * 1200, start);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(context.destination);
      source.start(start);
      source.stop(start + duration);
    }

    function playSynthNote(context, destination, options) {
      const osc = rememberAudioNode(context.createOscillator());
      const gain = rememberAudioNode(context.createGain());
      osc.type = options.type || "sawtooth";
      osc.frequency.setValueAtTime(options.frequency, options.start);
      if (options.bendTo) {
        osc.frequency.exponentialRampToValueAtTime(options.bendTo, options.start + options.duration * 0.9);
      }
      gain.gain.setValueAtTime(0.0001, options.start);
      gain.gain.exponentialRampToValueAtTime(options.volume, options.start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, options.start + options.duration);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(options.start);
      osc.stop(options.start + options.duration + 0.04);
    }

    function playKick(context, start, destination) {
      playSynthNote(context, destination, {
        type: "sine",
        frequency: 92,
        bendTo: 38,
        start,
        duration: 0.16,
        volume: 0.32
      });
    }

    function playHat(context, start) {
      playNoiseBurst(context, start, 0.045, 0.035);
    }

    function playSnare(context, start) {
      playNoiseBurst(context, start, 0.12, 0.11);
    }

    function playSetlistTrack(trackIndex, title) {
      const context = getAudioContext();
      stopSetlistAudio();

      const now = context.currentTime + 0.03;
      const song = trackSongs[trackIndex % trackSongs.length];
      const beat = 60 / song.bpm;
      const step = beat / 2;
      const bars = 12;
      const stepsPerBar = 8;
      const trackLength = bars * stepsPerBar * step + 1.2;
      const master = rememberAudioNode(context.createGain());
      const shaper = rememberAudioNode(context.createWaveShaper());
      const delay = rememberAudioNode(context.createDelay());
      const feedback = rememberAudioNode(context.createGain());
      const tone = rememberAudioNode(context.createBiquadFilter());

      const curve = new Float32Array(256);
      for (let index = 0; index < curve.length; index += 1) {
        const x = (index / 128) - 1;
        curve[index] = Math.tanh(x * (4.2 + trackIndex * 0.25));
      }
      shaper.curve = curve;
      delay.delayTime.value = 0.13 + (trackIndex % 4) * 0.018;
      feedback.gain.value = 0.28;
      tone.type = "lowpass";
      tone.frequency.setValueAtTime(1900 + trackIndex * 120, now);
      tone.Q.value = 0.8;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.24, now + 0.18);
      master.gain.setValueAtTime(0.24, now + trackLength - 0.9);
      master.gain.exponentialRampToValueAtTime(0.001, now + trackLength);

      shaper.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(tone);
      shaper.connect(tone);
      tone.connect(master);
      master.connect(context.destination);

      for (let bar = 0; bar < bars; bar += 1) {
        for (let stepIndex = 0; stepIndex < stepsPerBar; stepIndex += 1) {
          const start = now + (bar * stepsPerBar + stepIndex) * step;
          const riffRatio = song.riff[(stepIndex + bar) % song.riff.length];
          const leadRatio = song.lead[(stepIndex * 2 + bar) % song.lead.length];
          const palmMute = stepIndex % 2 === 0 || bar > 7;

          playSynthNote(context, shaper, {
            type: palmMute ? "square" : "sawtooth",
            frequency: song.root * riffRatio,
            bendTo: song.root * riffRatio * (stepIndex % 4 === 3 ? 0.5 : 1.01),
            start,
            duration: step * (palmMute ? 0.78 : 1.45),
            volume: palmMute ? 0.19 : 0.14
          });

          if (stepIndex === 0 || stepIndex === 4 || (bar > 5 && stepIndex === 6)) {
            playKick(context, start, context.destination);
          }

          if (stepIndex === 2 || stepIndex === 6) {
            playSnare(context, start + 0.01);
          }

          if (stepIndex % 2 === 1) {
            playHat(context, start);
          }

          if ((bar === 3 || bar === 7 || bar === 11) && stepIndex >= 4) {
            playSynthNote(context, shaper, {
              type: "triangle",
              frequency: song.root * leadRatio * 2,
              bendTo: song.root * leadRatio * 2.12,
              start,
              duration: step * 1.25,
              volume: 0.075
            });
          }
        }
      }

      playNoiseBurst(context, now + 0.04, 0.3, 0.13);
      playNoiseBurst(context, now + trackLength * 0.34, 0.45, 0.08);
      playNoiseBurst(context, now + trackLength * 0.67, 0.52, 0.09);
      playNoiseBurst(context, now + trackLength - 0.65, 0.55, 0.12);

      audioStatus.textContent = `Playing long track: ${title}`;
      activeAudioTimers.push(setTimeout(() => {
        if (audioStatus.textContent === `Playing long track: ${title}`) {
          audioStatus.textContent = "Audio armed: click a track";
        }
      }, trackLength * 1000));
    }

    function playSlasherScream(tile) {
      const nowMs = performance.now();
      if (nowMs - lastScreamTime < 520) {
        return;
      }
      lastScreamTime = nowMs;

      const context = getAudioContext();
      const now = context.currentTime + 0.02;
      const screamGain = rememberAudioNode(context.createGain());
      const filter = rememberAudioNode(context.createBiquadFilter());
      const wobble = rememberAudioNode(context.createOscillator());
      const wobbleGain = rememberAudioNode(context.createGain());
      const scream = rememberAudioNode(context.createOscillator());
      const shriek = rememberAudioNode(context.createOscillator());
      const shriekGain = rememberAudioNode(context.createGain());

      scream.type = "sawtooth";
      scream.frequency.setValueAtTime(1180 + Math.random() * 180, now);
      scream.frequency.exponentialRampToValueAtTime(410, now + 0.62);
      shriek.type = "square";
      shriek.frequency.setValueAtTime(2400 + Math.random() * 320, now);
      shriek.frequency.exponentialRampToValueAtTime(1250, now + 0.5);
      wobble.type = "sine";
      wobble.frequency.value = 13;
      wobbleGain.gain.value = 95;
      wobble.connect(wobbleGain);
      wobbleGain.connect(scream.frequency);
      wobbleGain.connect(shriek.frequency);

      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2600, now);
      filter.frequency.exponentialRampToValueAtTime(900, now + 0.62);
      filter.Q.value = 14;
      screamGain.gain.setValueAtTime(0.0001, now);
      screamGain.gain.exponentialRampToValueAtTime(0.48, now + 0.035);
      screamGain.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
      shriekGain.gain.setValueAtTime(0.0001, now);
      shriekGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      shriekGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

      scream.connect(filter);
      shriek.connect(shriekGain);
      filter.connect(screamGain);
      shriekGain.connect(context.destination);
      screamGain.connect(context.destination);
      wobble.start(now);
      scream.start(now);
      shriek.start(now);
      wobble.stop(now + 0.7);
      scream.stop(now + 0.7);
      shriek.stop(now + 0.45);
      playNoiseBurst(context, now + 0.02, 0.34, 0.22);
      playNoiseBurst(context, now + 0.18, 0.2, 0.12);

      tile.classList.add("screaming");
      audioStatus.textContent = `${tile.dataset.label} screamed`;
      setTimeout(() => tile.classList.remove("screaming"), 520);
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function distance(a, b) {
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function placeElement(element, point) {
      element.style.left = `${point.x}%`;
      element.style.top = `${point.y}%`;
    }

    function randomPoint() {
      return {
        x: 10 + Math.random() * 80,
        y: 12 + Math.random() * 76
      };
    }

    function updateGameHud() {
      scoreReadout.textContent = `Score: ${String(score).padStart(3, "0")}`;
      healthReadout.textContent = `Signal: ${Math.max(0, Math.ceil(health))}%`;
      levelReadout.textContent = `Wave: ${String(wave).padStart(2, "0")}`;
      objectiveReadout.textContent = `Sigils: ${collected}/6`;
      pitEnergy = clamp(collected * 16 + (100 - health) * 0.25, 0, 100);
      updateFearMeter();
    }

    function spawnGhostText(text, point = randomPoint()) {
      const ghost = document.createElement("span");
      ghost.className = "ghost-text";
      ghost.textContent = text;
      ghost.style.left = `${point.x}%`;
      ghost.style.top = `${point.y}%`;
      gameArena.appendChild(ghost);
      ghost.addEventListener("animationend", () => ghost.remove());
    }

    function moveSigil() {
      let next = randomPoint();
      while (distance(next, player) < 22) {
        next = randomPoint();
      }
      sigil.x = next.x;
      sigil.y = next.y;
      placeElement(sigilEl, sigil);
    }

    function addEnemy(index) {
      const point = randomPoint();
      const element = document.createElement("div");
      element.className = "enemy";
      element.textContent = index % 2 ? "!" : "X";
      gameArena.appendChild(element);
      enemies.push({
        x: point.x,
        y: point.y,
        speed: 10 + wave * 2.3 + index,
        drift: Math.random() * 10,
        element
      });
      placeElement(element, point);
    }

    function clearEnemies() {
      enemies.splice(0).forEach((enemy) => enemy.element.remove());
    }

    function setOverlay(message, hidden = false) {
      gameOverlay.innerHTML = message;
      gameOverlay.classList.toggle("hidden", hidden);
    }

    function startGame() {
      const nextWave = Number(startGameButton.dataset.nextWave || "1");
      cancelAnimationFrame(animationFrame);
      gameRunning = true;
      if (nextWave === 1) {
        score = 0;
      }
      health = 100;
      wave = nextWave;
      collected = 0;
      hitCooldown = 0;
      startGameButton.dataset.nextWave = "1";
      startGameButton.textContent = "Restart Nightmare";
      player.x = 50;
      player.y = 50;
      clearEnemies();
      for (let index = 0; index < 2; index += 1) {
        addEnemy(index);
      }
      moveSigil();
      placeElement(playerEl, player);
      updateGameHud();
      setOverlay("", true);
      gameArena.focus();
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(gameLoop);
    }

    function winWave() {
      gameRunning = false;
      cancelAnimationFrame(animationFrame);
      score += wave * 66;
      wave += 1;
      collected = 0;
      health = clamp(health + 18, 0, 100);
      quoteOutput.textContent = "Wave cleared. The cabinet pretends to be impressed.";
      body.classList.add("corrupted");
      setTimeout(() => body.classList.remove("corrupted"), 1100);
      setOverlay(`Wave ${String(wave - 1).padStart(2, "0")} Cleared<br />Press Start To Descend`);
      startGameButton.dataset.nextWave = String(wave);
      startGameButton.textContent = "Next Wave";
      updateGameHud();
    }

    function loseGame() {
      gameRunning = false;
      cancelAnimationFrame(animationFrame);
      body.classList.add("corrupted");
      quoteOutput.textContent = "Game over. Your initials have been replaced with static.";
      setOverlay("Game Over<br />The Cabinet Keeps Your Name");
      startGameButton.dataset.nextWave = "1";
      startGameButton.textContent = "Retry Nightmare";
      setTimeout(() => body.classList.remove("corrupted"), 2600);
    }

    function collectSigil() {
      collected += 1;
      score += 25 + wave * 10;
      spawnGhostText(["GOOD", "WRONG", "AGAIN", "RUN"][Math.floor(Math.random() * 4)], sigil);
      randomWarning();
      moveSigil();
      if (collected >= 6) {
        winWave();
      }
    }

    function damagePlayer() {
      if (hitCooldown > 0) {
        return;
      }
      hitCooldown = 0.9;
      health -= 18 + wave * 2;
      gameArena.classList.add("shake");
      spawnGhostText("SIGNAL HIT", player);
      setTimeout(() => gameArena.classList.remove("shake"), 760);
      if (health <= 0) {
        health = 0;
        updateGameHud();
        loseGame();
      }
    }

    function gameLoop(time) {
      if (!gameRunning) {
        return;
      }

      const delta = Math.min((time - lastFrameTime) / 1000, 0.04);
      lastFrameTime = time;
      hitCooldown = Math.max(0, hitCooldown - delta);

      let dx = 0;
      let dy = 0;
      if (keys.has("ArrowLeft") || keys.has("a")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("d")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("w")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("s")) dy += 1;

      if (dx || dy) {
        const length = Math.hypot(dx, dy);
        player.x = clamp(player.x + (dx / length) * player.speed * delta, 4, 96);
        player.y = clamp(player.y + (dy / length) * player.speed * delta, 6, 94);
        placeElement(playerEl, player);
      }

      enemies.forEach((enemy, index) => {
        const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed * delta;
        enemy.y += Math.sin(angle) * enemy.speed * delta;
        enemy.x += Math.sin(time / 220 + enemy.drift) * delta * (index + 1) * 2.2;
        enemy.y += Math.cos(time / 260 + enemy.drift) * delta * (index + 1) * 1.7;
        enemy.x = clamp(enemy.x, 3, 97);
        enemy.y = clamp(enemy.y, 5, 95);
        placeElement(enemy.element, enemy);
        if (distance(enemy, player) < 6) {
          damagePlayer();
        }
      });

      if (distance(player, sigil) < 7) {
        collectSigil();
      }

      updateGameHud();
      animationFrame = requestAnimationFrame(gameLoop);
    }

    // The corruption button temporarily turns the whole page into a broken tape.
    corruptButton.addEventListener("click", () => {
      body.classList.add("corrupted");
      randomWarning();
      if (gameRunning) {
        health = clamp(health - 10, 0, 100);
        spawnGhostText("CHEAT CODE REJECTED", randomPoint());
      }
      setTimeout(() => body.classList.remove("corrupted"), 3300);
    });

    // Mode toggle shifts the palette from grimy nightmare to brighter neon.
    modeToggle.addEventListener("click", () => {
      body.classList.toggle("neon-mode");
      modeToggle.textContent = body.classList.contains("neon-mode") ? "✦" : "☾";
      modeToggle.title = body.classList.contains("neon-mode") ? "Toggle Nightmare Mode" : "Toggle Neon Mode";
    });

    quoteButton.addEventListener("click", randomWarning);

    // Keyboard and mobile controls drive the corrupted arcade arena.
    startGameButton.addEventListener("click", startGame);

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
        event.preventDefault();
        keys.add(event.key.startsWith("Arrow") ? event.key : key);
      }
      if (!gameRunning && (event.key === "Enter" || event.key === " ")) {
        startGame();
      }
    });

    window.addEventListener("keyup", (event) => {
      const key = event.key.toLowerCase();
      keys.delete(event.key.startsWith("Arrow") ? event.key : key);
    });

    dpadButtons.forEach((button) => {
      const dir = button.dataset.dir;
      const map = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
      button.addEventListener("pointerdown", () => keys.add(map[dir]));
      button.addEventListener("pointerup", () => keys.delete(map[dir]));
      button.addEventListener("pointerleave", () => keys.delete(map[dir]));
    });

    // Nightmare cards reveal their hidden messages when selected.
    nightmareCards.forEach((card) => {
      card.addEventListener("click", () => {
        const message = card.querySelector(".nightmare-message");
        card.classList.toggle("revealed");
        message.textContent = card.classList.contains("revealed")
          ? card.dataset.message
          : "Click to reveal the curse.";
      });
    });

    // The slasher poster tiles shriek when hovered or keyboard-focused.
    slasherTiles.forEach((tile) => {
      tile.addEventListener("pointerenter", () => playSlasherScream(tile));
      tile.addEventListener("focus", () => playSlasherScream(tile));
    });

    // Haunted setlist interaction marks one track as currently playing.
    trackItems.forEach((item, index) => {
      item.addEventListener("click", () => {
        trackItems.forEach((track) => track.classList.remove("playing"));
        trackItems.forEach((track) => track.classList.remove("sound-hit"));
        item.classList.add("playing");
        item.classList.add("sound-hit");
        const trackTitle = item.textContent.replace(" NOW PLAYING", "");
        quoteOutput.textContent = `Now playing: ${trackTitle}`;
        playSetlistTrack(index, trackTitle);
        item.addEventListener("animationend", () => item.classList.remove("sound-hit"), { once: true });
        if (gameRunning) {
          score += 13;
          spawnGhostText("BASS BOOST", randomPoint());
        }
      });
    });

    stopAudioButton.addEventListener("click", () => {
      stopSetlistAudio();
      trackItems.forEach((track) => track.classList.remove("playing"));
    });

    placeElement(playerEl, player);
    placeElement(sigilEl, sigil);
    updateFearMeter();
    updateGameHud();
