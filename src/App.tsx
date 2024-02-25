import { useEffect, useState, Dispatch, SetStateAction } from 'react'
import Header from './components/Header.tsx'
import { Tooltip } from './components/Tooltip.tsx'
import OnScreenKeyboard from "./components/OnScreenKeyboard.tsx"
import './App.css'

type RawQuestion = {
    title: string,
    extract: string,
    pageid: number
}

type SolutionArrayMember = {
    key: string,
    is_const: boolean
}

type ParsedQuestion = {
    originalTitle: string,
    parsedTitle: string,
    description: string,
    censoredDescription: string,
    solutionStripped: string,
    solutionArray: SolutionArrayMember[],
    index: number,
    pageid: number
}

interface GameProps {
    question: ParsedQuestion,
    showNewQuestion: () => void,
    statisticsControls:  StatisticsControls
}

interface TermProps {
    question: ParsedQuestion,
    isCorrect: boolean,
    currentGuess: string[],
    currentIndex: number,
    bgColor: string,
    handleCharClick: (event : React.MouseEvent<HTMLDivElement>) => void
}

interface DescriptionProps {
    question: ParsedQuestion,
    isCorrect: boolean,
    showNewQuestion: () => void,
}

interface StatisticsControls {
    numQuestionAsked: number,
    numQuestionCorrect: number,
    setNumQuestionsCorrect: Dispatch<SetStateAction<number>>,
    bestNumQuestionAsked: number,
    bestNumQuestionCorrect: number
}

const isLegalInput = (key: string) : boolean => {
    //return (/^[A-Za-z\u05D0-\u05EA0-9]$/.test(key))
    return (/^[\u05D0-\u05EA]$/.test(key))
}

const stripNonLegalChars = (words: string[]): string[] => {
    const cleanedWords = words.map(word =>
        word.split('').filter(char => isLegalInput(char)).join('')
    );

    return cleanedWords;
}

const stripNiqqud = (text: string): string => {
    const niqqudRegex = /[\u0591-\u05bd\u05bf-\u05C7]/g;
    return text.replace(niqqudRegex, '');
}

const stripParentheses = (text: string) => {
    //return text.replace(/\(([^)]*)\)/g, (match, group1) => ``);
    let isEqual = true;
    do {
        const prevText = text
        text = text.replace(/\(([^())]*)\)/g, "");
        isEqual = (prevText == text);
    } while (!isEqual);
    return text;
}

const censorText = (description: string, forbiddenWords: string[]): string => {
    let censoredText = description;

    const escapeRegExp = (string: string): string => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }
    
    forbiddenWords.forEach(word => {
        const regex = new RegExp(`(${escapeRegExp(word)})`, 'gi');
        censoredText = censoredText.replace(regex, (_, p1) => '█'.repeat(p1.length));
    });

    censoredText = censoredText.replace(/([a-zA-ZÀ-ÖØ-öø-ÿǒī]+)/g, (_, p1) => '█'.repeat(p1.length));

    // After the first pass, censor any partially censored words
    censoredText = censoredText.replace(/█([\u05D0-\u05EA]+)/g, (_, p1) => '█'.repeat(p1.length));
    censoredText = censoredText.replace(/([\u05D0-\u05EA]+)█/g, (_, p1) => '█'.repeat(p1.length));

    return censoredText;
}

const englishToHebrewQwerty = (character: string): string => {
    const englishChars = 'ertyuiopasdfghjkl;zxcvbnm,.';
    const hebrewChars = 'קראטוןםפשדגכעיחלךףזסבהנמצתץ';
    const index = englishChars.indexOf(character.toLowerCase());
    return index !== -1 ? hebrewChars[index] : character;
}

const isAllDigits = (input: string): boolean => {
    return /^\d+$/.test(input);
}

const reverseDigitSequences = (input: string): string => {
    return input.replace(/\d+/g, (match) => {
        return match.split('').reverse().join('');
    });
}

const isMobile = () => {
    // Far from perfect but opefully good enough for our purposes
    return Math.min(window.screen.width, window.screen.height) < 768 || navigator.userAgent.indexOf("Mobi") > -1;
}

function removeAtIndex<T>(array: T[], index: number): T[] {
    if (index < 0 || index >= array.length) {
        throw new Error("Index out of bounds.");
    }
    
    return array.filter((_, idx) => idx !== index);
}

function Term({ question, isCorrect, currentGuess, currentIndex, bgColor, handleCharClick}: TermProps) {
    
    let currentGuessIndex = 0;
    const words = question.parsedTitle.split(/\s+/);

    return (
        <div className="term" tabIndex={0}>
            {words.map((word, index) => (
                <div key={index} className="word">
                    {word.split('').map(() => {
                        const guessChar = currentGuess[currentGuessIndex];
                        const classNames = ['character', `background_${bgColor}`];
                        if (question.solutionArray[currentGuessIndex].is_const) {
                            classNames.push('const');
                        } else {
                            if ( (!isCorrect) &&  (currentIndex === currentGuessIndex) ) {
                                classNames.push('selected');
                            }
                        }
                        const ret = (
                            <div key={currentGuessIndex} className={classNames.join(" ")} 
                                    onClick={handleCharClick} data-index={currentGuessIndex}>
                                {(question.solutionArray[currentGuessIndex].is_const) ? question.solutionArray[currentGuessIndex].key : guessChar}
                            </div>
                        );
                        currentGuessIndex++;
                        return ret;
                    })}
                </div>
            ))}
        </div>
    )
}

function Description({ question, isCorrect, showNewQuestion}: DescriptionProps) {

    const description = (isCorrect) ? question.description : question.censoredDescription;
    const wikiPage = "https://he.wikipedia.org/?curid=" + question.pageid;

    return (
        <div className='description'>
            <div>        
            {
                description.split('\n').map((paragraph, index) => (
                    <p key={index}>
                        {paragraph}
                    </p>
                ))
            }
            </div>
            <div id="reference">
                מקור: 
                <Tooltip text="זהירות! לחיצה על הקישור תוביל לדף הערך בויקיפדיה ותחשוף את התשובה!">
                    <a href={wikiPage} target="_BLANK" onClick={showNewQuestion} onAuxClick={showNewQuestion}>ויקיפדיה</a>
                </Tooltip>, 
                רשיון: <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a>
            </div>
        </div>
    )
}


function Game({ question, showNewQuestion, statisticsControls }: GameProps) {
    const [isCorrect, setIsCorrect] = useState(false);

    const [bgColor, setBgColor] = useState('default');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentGuess, setCurrentGuess] = useState<string[]>(Array.from({ length: question.solutionArray.length }, () => ''));

    useEffect(()=> { 
        setCurrentIndex(() => 0);
        setCurrentGuess(() => Array.from({ length: question.solutionArray.length }, () => ''));
        setIsCorrect(() => false);
        setBgColor(() => 'default');
        if (question.solutionArray[0].is_const) {
            setCurrentIndex(() => moveForward(0));
        }
        window.scrollTo(0, 0);
     }, [question]);

    const moveBackwards = (index: number) : number => {
        let firstIndex = 0;
        while (question.solutionArray[firstIndex].is_const) {
            firstIndex += 1;
        }

        do {
            index -= 1;
        } while ( (index > firstIndex) && (question.solutionArray[index].is_const) );
        index = Math.max(index, firstIndex);
        return index;
    }

    const moveForward = (index: number) : number => {
        let lastIndex = question.solutionArray.length - 1;
        while (question.solutionArray[lastIndex].is_const) {
            lastIndex -= 1;
        }

        do {
            index += 1;
        } while ( (index < lastIndex) && (question.solutionArray[index].is_const) );
        index = Math.min(index, lastIndex);

        return index;
    }

    const checkSolution = () => {
        window.scrollTo(0, 0);
        if (currentGuess.join('') === question.solutionStripped) {
            setIsCorrect(true);
            setBgColor('green');
            statisticsControls.setNumQuestionsCorrect(prev => prev + 1);
        }
        else {
            setBgColor('red');
            setTimeout(() => setBgColor(''), 1000);
        }
    }
   
    const handleKeyup = (event : KeyboardEvent) => {
        let newChar = currentGuess[currentIndex];
        let nextIndex = currentIndex;
        let eventKey = event.key;
        
        if (event.ctrlKey) {
            return;
        }

        if (eventKey === "Escape") {
            showNewQuestion();
        }

        if (isCorrect) {
            if (eventKey === 'Enter') {
                showNewQuestion();
            }
            return;
        }

        if (eventKey === 'Enter') {
            checkSolution();
        }
        else if (eventKey === 'Backspace') {
            newChar = '';
            nextIndex = moveBackwards(currentIndex);
        }
        else if (eventKey === 'Delete') {
            newChar = '';
        }
        else if (eventKey === 'ArrowLeft') {
            nextIndex = moveForward(currentIndex);
        }
        else if (eventKey === 'ArrowRight') {
            nextIndex = moveBackwards(currentIndex);
        }
        else if (eventKey.length === 1) {
            let key = eventKey;
            if (/^[a-zA-Z,\.;]$/.test(eventKey)) {
                key = englishToHebrewQwerty(eventKey.toLowerCase());
            }
            if (isLegalInput(key)) {
                newChar = key;
                nextIndex = moveForward(currentIndex);
            } 
        }
        else {
            return;
        }

        if (currentGuess[currentIndex] != newChar) {
            const newGuess = [...currentGuess];
            newGuess[currentIndex] = newChar;
            setCurrentGuess(() => newGuess);
        }

        if (nextIndex != currentIndex) {
            setCurrentIndex(() => nextIndex);
        }
    }

    useEffect(() => {
        window.addEventListener('keyup', handleKeyup)
        return () => window.removeEventListener('keyup', handleKeyup)
    }, [handleKeyup]);

    const handleCharClick = (event : React.MouseEvent<HTMLDivElement>) => {
        const indexStr = (event.target as HTMLDivElement).getAttribute("data-index");
        if (indexStr == null) {
            return;
        }

        const indexNum = parseInt(indexStr, 10);
        if ( (indexNum < 0) || (indexNum >= question.solutionArray.length) ) {
            return;
        }
        setCurrentIndex(() => indexNum);
    }

    return (
        <div>
            <div className='control'>
                <Tooltip text="טיפ: נוח יותר להקיש Enter לבדיקת הפתרון">
                    <button onClick={checkSolution} className='btn btn-light' disabled={isCorrect}>בדיקת הפתרון</button>
                </Tooltip>

                <div id="score">
                    תוצאה: {statisticsControls.numQuestionCorrect}/{statisticsControls.numQuestionAsked} 
                    &nbsp;
                    {
                        statisticsControls.bestNumQuestionCorrect ? (
                            <>
                                <br/>
                                <span style={{fontSize: "0.7em"}}>
                                    (שיא אישי: {statisticsControls.bestNumQuestionCorrect}/{statisticsControls.bestNumQuestionAsked})
                                </span>
                            </>
                        ) : (
                            <></>
                        )
                    }
                </div>
                
                <Tooltip text="טיפ: נוח יותר להקיש Esc למעבר לערך אחר">
                    <button onClick={showNewQuestion} className='btn btn-light'>ערך אחר</button>
                </Tooltip>
            </div>
            <Term question={question} isCorrect={isCorrect} 
                  currentGuess={currentGuess} currentIndex={currentIndex}
                  bgColor={bgColor} handleCharClick={handleCharClick}/>
            <Description question={question} isCorrect={isCorrect} showNewQuestion={showNewQuestion}/>
        </div>
    );
}

function App(): JSX.Element {
    const [data, setData] = useState<RawQuestion[]>([]);
    const [question, setQuestion] = useState<ParsedQuestion | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [numQuestionAsked, setNumQuestionAsked] = useState<number>(0);
    const [numQuestionCorrect, setNumQuestionsCorrect] = useState<number>(0);
    const [bestNumQuestionAsked, setBestNumQuestionAsked] = useState<number>(0);
    const [bestNumQuestionCorrect, setBestNumQuestionsCorrect] = useState<number>(0);

    const statisticsControls: StatisticsControls = {
        numQuestionAsked,
        numQuestionCorrect,
        setNumQuestionsCorrect,
        bestNumQuestionAsked,
        bestNumQuestionCorrect
    };
    
    useEffect(() => {
        fetchData();

        const storedStatsRaw = localStorage.getItem('gameStats');
        if (storedStatsRaw) {
            const storedStats = JSON.parse(storedStatsRaw);
            if (storedStats) {
                setBestNumQuestionAsked(storedStats.bestNumQuestionAsked || 0);
                setBestNumQuestionsCorrect(storedStats.bestNumQuestionCorrect || 0);
            }
        }
    }, []);

    useEffect(() => {
        if (!isLoading && data.length > 0) {
            showNewQuestion();
        }
    }, [isLoading, data]);

    useEffect(()=> { 
        if ( 
            (numQuestionCorrect > bestNumQuestionCorrect) 
            || 
            ( (numQuestionCorrect == bestNumQuestionCorrect) && (numQuestionAsked < bestNumQuestionAsked) )
            )
        {
            setBestNumQuestionAsked(numQuestionAsked);
            setBestNumQuestionsCorrect(numQuestionCorrect);
            const newGameStats = JSON.stringify({
                version: 1,
                bestNumQuestionAsked: numQuestionAsked,
                bestNumQuestionCorrect: numQuestionCorrect,
            });
            localStorage.setItem('gameStats', newGameStats);
            console.log(newGameStats);
        }
    }, [numQuestionCorrect]);
    
    const fetchData = async (): Promise<void> => {
        try {
            //await new Promise(resolve => setTimeout(resolve, 5000));
            const response = await fetch('top_articles.json');
            const jsonData: RawQuestion[] = await response.json();
            setData(prevData => {
                if (prevData.length != 0) {
                    // https://stackoverflow.com/questions/61254372/
                    setNumQuestionAsked(0);
                }
                return jsonData;
            });
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching data: ', error);
            setIsLoading(false);
        }
    };
    
    const showNewQuestion = (): void => {
        if (data.length == 0) {
            setQuestion(() => {
                return null;
            });
            return;
        }

        const MIN_DESC_LENGTH = 150;
        let rawQuestion : RawQuestion;

        const skipTermsInDesc = [
            "       " // Found in math articles which don't render correctly
        ]

        const randomIndex = Math.floor(Math.random() * data.length);

        try {
            rawQuestion = data[randomIndex];
            console.log(`Initial title: ${rawQuestion.title}`);

            if (rawQuestion.extract.length < MIN_DESC_LENGTH) {
                throw new Error(`Skipping ${rawQuestion.title} since description length is smaller than minimum`);
            }

            if (skipTermsInDesc.some(forbiddenStr => rawQuestion.extract.includes(forbiddenStr))) {
                throw new Error(`Skipping ${rawQuestion.title} since description contains forbidden term`);
            }

            if (/[a-zA-Z]/.test(rawQuestion.title)) {
                throw new Error(`Skipping ${rawQuestion.title} since title contains English`);
            }

            if (isAllDigits(rawQuestion.title)) {
                throw new Error(`Skipping ${rawQuestion.title} since description is fully composed of digits`);
            }

            const title = stripNiqqud(stripParentheses(rawQuestion.title)).trim();
            const description = stripNiqqud(stripParentheses(rawQuestion.extract)).replace(/ ,/g, ",")
                                .replace(/ \./g, ".").replace(/־/g, "-").replace(/\[דרוש מקור\]/g, "");
            let titleWords = title.split(/\s+/);
            titleWords = titleWords.map(word => reverseDigitSequences(word));
            const parsedTitle = titleWords.join(" ");
            const solutionArray = parsedTitle.replace(/\s+/g, '').split('').map(char => ({
                key: char,
                is_const: !isLegalInput(char)
            }));
            const solutionStripped = stripNonLegalChars(solutionArray.map(obj => obj.key)).join('');

            if (solutionStripped == "") {
                throw new Error(`Skipping ${rawQuestion.title} since solutionStripped is empty`);
            }

            const censoredDescription = censorText(description, 
                [...stripNonLegalChars(titleWords), 
                 ...titleWords.filter(word => !isAllDigits(word))
                              .filter(str => !['-'].includes(str))])
            
            if (!censoredDescription.includes("█")) {
                throw new Error(`Skipping ${rawQuestion.title} since didn't find anything to censor`);
            }

            if (isMobile()) {
                const max_word_len = 8;
                for (const word of titleWords) {
                    if (word.length > max_word_len) {
                        throw new Error(`Skipping ${rawQuestion.title} since word too long`);
                    }
                }
            }

            const parsedQuestion : ParsedQuestion = {
                originalTitle: title,
                parsedTitle: parsedTitle,
                description: description,
                solutionArray: solutionArray,
                solutionStripped: solutionStripped,
                index: randomIndex,
                pageid: rawQuestion.pageid,
                censoredDescription: censoredDescription,
            }

            console.log(`Selected title: ${title}`);

            setQuestion(() => {
                return parsedQuestion
            });

            setNumQuestionAsked(prev => prev + 1);
        } catch (error) {
            if (error instanceof Error) {
                console.log(error.message);
            }
            setData(oldData => {
                return removeAtIndex(oldData, randomIndex);
            });
        }
        
    };

    const skipQuestion = (): void => {
        setData(oldData => {
            if ( (question != null) && (oldData.length > 0) ) {
                return removeAtIndex(oldData, question.index);
            }
            return oldData;
        });
    };

    useEffect(() => {
        // Blur all elements after click. Otherwise, the Enter key keeps clicking
        //  them instead of checking the current solution.
        const handleClick = () => {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
        };
        
        document.body.addEventListener('click', handleClick);
        
        return () => {
            document.body.removeEventListener('click', handleClick);
        };
    }, []);

    return (
        <>
            <Header></Header>
            <div className="App">
                <h1>מה הערך?</h1>
                <h2>משחק זיהוי ערכים</h2>
                {isLoading ? (
                    <div id="loader">
                        <div className="spinner-border" id="loader" role="status">
                            <span className="sr-only"></span>
                        </div>
                    </div>
                ) : (
                    <div>
                        {question && data.length > 0 && (
                            <Game question={question} showNewQuestion={skipQuestion} statisticsControls={statisticsControls}/>
                        )}
                        {data.length == 0 && <div className='game_over'>זהו. זה נגמר. סיימתם הכל. נראה אתכם מחר?</div>}
                        <OnScreenKeyboard />
                    </div>
                )}
            </div>
        </>
    )
}

export default App;
