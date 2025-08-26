    function playGame(userChoice) {
      const userChoiceMessage = `You Have Chosen ${userChoice}`;
      
      let randomNum = Math.random() * 3;
      let computerChoice;
      if (randomNum <= 1) {
        computerChoice = 'Bat';
      } else if (randomNum <= 2) {
        computerChoice = 'Ball';
      } else {
        computerChoice = 'Stump';
      }
      
      const compChoiceMessage = `-> Computer Choice : ${computerChoice}`;
      let resultMessage;

      if (userChoice === computerChoice) {
        resultMessage = '-> It is Tie.';
      } else if (
        (userChoice === 'Bat' && computerChoice === 'Ball') ||
        (userChoice === 'Ball' && computerChoice === 'Stump') ||
        (userChoice === 'Stump' && computerChoice === 'Bat')
      ) {
        resultMessage = '-> User Won.';
      } else {
        resultMessage = '-> Computer Won.';
      }

      alert(`${userChoiceMessage} ${compChoiceMessage} ${resultMessage}`);
    }
</script>
