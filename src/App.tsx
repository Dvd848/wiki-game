import { useEffect, useState, Dispatch, SetStateAction, useRef } from 'react'
import Header from './components/Header.tsx'
import Footer from './components/Footer.tsx'
import { Tooltip } from './components/Tooltip.tsx'
import OnScreenKeyboard from "./components/OnScreenKeyboard.tsx"
import { Offcanvas } from "bootstrap"
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
    statisticsControls:  StatisticsControls,
    showKeyboard: () => void
}

interface StatisticsProps {
    statisticsControls:  StatisticsControls
}

interface TermProps {
    question: ParsedQuestion,
    isCorrect: boolean,
    isRevealed: boolean,
    currentGuess: string[],
    currentIndex: number,
    bgColor: string,
    handleCharClick: (event : React.MouseEvent<HTMLDivElement>) => void,
    showKeyboard: () => void
}

interface DescriptionProps {
    question: ParsedQuestion,
    showFullDescription: boolean,
    showNewQuestion: () => void,
}

export interface StatisticsControls {
    numQuestionsAsked: number,
    numQuestionsCorrect: number,
    setNumQuestionsCorrect: Dispatch<SetStateAction<number>>,
    numQuestionsIncorrect: number,
    setNumQuestionsIncorrect: Dispatch<SetStateAction<number>>,
    bestNumQuestionsAsked: number,
    bestNumQuestionsCorrect: number,
    bestNumQuestionsIncorrect: number
}

export const calculatePoints = (numQuestionsCorrect: number, numQuestionsIncorrect: number) => {
    return (numQuestionsCorrect * 3) - (numQuestionsIncorrect);
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

    censoredText = censoredText.replace(/([a-zA-ZÀ-ÖØ-öø-ÿǒīł]+)/g, (_, p1) => '█'.repeat(p1.length));

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

const scrollToTopIfNeeded = () => {
    const term = document.getElementById("term");
    if (term == null) {
        return;
    }
    const rect = term.getBoundingClientRect();

    const isVisible = (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    // If the element is not in the viewport, scroll it into view
    if (!isVisible) {
        document.getElementById("subtitle")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function removeAtIndex<T>(array: T[], index: number): T[] {
    if (index < 0 || index >= array.length) {
        throw new Error("Index out of bounds.");
    }
    
    return array.filter((_, idx) => idx !== index);
}

function Term({ question, isCorrect, isRevealed, currentGuess, currentIndex, bgColor, handleCharClick, showKeyboard}: TermProps) {
    
    let currentGuessIndex = 0;
    const words = question.parsedTitle.split(/\s+/);

    return (
        <div className="term" tabIndex={0} id="term">
            {words.map((word, index) => (
                <div key={index} className="word">
                    {word.split('').map(() => {
                        const guessChar = currentGuess[currentGuessIndex];
                        const classNames = ['character', `background_${bgColor}`];
                        if (isRevealed) {
                            classNames.push('revealed');
                        }
                        if (question.solutionArray[currentGuessIndex].is_const) {
                            classNames.push('const');
                        } else {
                            if ( (!isCorrect) &&  (currentIndex === currentGuessIndex) ) {
                                classNames.push('selected');
                            }
                        }
                        const ret = (
                            <div key={currentGuessIndex} className={classNames.join(" ")} 
                                    onClick={handleCharClick} data-index={currentGuessIndex} onTouchStart={showKeyboard}>
                                {(question.solutionArray[currentGuessIndex].is_const || isRevealed) 
                                    ? question.solutionArray[currentGuessIndex].key : guessChar}
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

function Description({ question, showFullDescription, showNewQuestion}: DescriptionProps) {

    const description = (showFullDescription) ? question.description : question.censoredDescription;
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

function Statistics({ statisticsControls }: StatisticsProps) {
    return (
        <div className="modal fade" id="statistics_modal" aria-labelledby="statistics_modal_label" aria-hidden="true">
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title fs-5" id="statistics_modal_label">סטטיסטיקה</h3>
                    <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div className="modal-body">
                    {
                        (statisticsControls.numQuestionsCorrect > 0 || statisticsControls.numQuestionsIncorrect > 0) ? 
                        (
                            <p>
                                במהלך המשחק הנוכחי השגתם 
                                <b dir="ltr"> {calculatePoints(statisticsControls.numQuestionsCorrect, statisticsControls.numQuestionsIncorrect)} </b> נקודות,
                                כאשר זיהיתם נכונה 
                                <b> {statisticsControls.numQuestionsCorrect} </b> ערכים ודילגתם על 
                                <b> {statisticsControls.numQuestionsIncorrect} </b> ערכים.
                            </p>
                        ) : (
                            <p>כאן תוכלו לראות סטטיסטיקות אודות המשחק הנוכחי ומשחק השיא שלכם.</p>
                        )
                    }
                    {
                        (statisticsControls.bestNumQuestionsCorrect > 0 || statisticsControls.bestNumQuestionsIncorrect > 0) ? 
                        (
                            <p>
                                במהלך משחק השיא שלכם השגתם 
                                <b dir="ltr"> {calculatePoints(statisticsControls.bestNumQuestionsCorrect, statisticsControls.bestNumQuestionsIncorrect)} </b> נקודות,
                                כאשר זיהיתם נכונה 
                                <b> {statisticsControls.bestNumQuestionsCorrect} </b> ערכים ודילגתם על 
                                <b> {statisticsControls.bestNumQuestionsIncorrect} </b> ערכים.
                            </p>
                        ) : (
                            <p>האם תצליחו לשבור את השיא האישי שלכם?</p>
                        )
                    }

                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">סגירה</button>
                </div>
            </div>
        </div>
    </div>
    )
}


function Game({ question, showNewQuestion, statisticsControls, showKeyboard }: GameProps) {
    const [isCorrect, setIsCorrect] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);

    const [bgColor, setBgColor] = useState('default');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentGuess, setCurrentGuess] = useState<string[]>(Array.from({ length: question.solutionArray.length }, () => ''));

    const [nextQuestionText, setNextQuestionText] = useState('');

    useEffect(()=> { 
        setCurrentIndex(() => 0);
        setCurrentGuess(() => Array.from({ length: question.solutionArray.length }, () => ''));
        setIsCorrect(() => false);
        setIsRevealed(() => false);
        setBgColor(() => 'default');
        if (question.solutionArray[0].is_const) {
            setCurrentIndex(() => moveForward(0));
        }
        scrollToTopIfNeeded();
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
        scrollToTopIfNeeded();
        if (currentGuess.join('') === question.solutionStripped) {
            setIsCorrect(true);
            setBgColor('correct');
            statisticsControls.setNumQuestionsCorrect(prev => prev + 1);
        }
        else {
            setBgColor('incorrect');
            setTimeout(() => setBgColor(''), 1000);
        }
    }

    const nextQuestion = () => {
        if (isCorrect || isRevealed) {
            showNewQuestion();
        }
        else {
            setBgColor('dark_red');
            setIsRevealed(() => true);
            statisticsControls.setNumQuestionsIncorrect(prev => prev + 1);
            scrollToTopIfNeeded();
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
            if (!document.body.classList.contains('modal-open')) {
                nextQuestion();
            }
        }

        if (isCorrect || isRevealed) {
            if (eventKey === 'Enter') {
                nextQuestion();
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

    const handleKeydown = (event : KeyboardEvent) => {
        if(event.key == " " && event.target == document.body) {
            // Prevent space from scrolling down
            event.preventDefault();
        }
    }

    useEffect(() => {
        window.addEventListener('keyup', handleKeyup)
        return () => window.removeEventListener('keyup', handleKeyup)
    }, [handleKeyup]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeydown)
        return () => window.removeEventListener('keydown', handleKeydown)
    }, [handleKeydown]);

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

    useEffect(() => {
        setNextQuestionText(() => (isCorrect || isRevealed) ? "לערך הבא" : "חשיפת הפתרון");
    }, [isCorrect, isRevealed]);

    

    return (
        <div>
            <div className='control'>
                {
                    isMobile() ? (
                        <button onClick={checkSolution} className='btn btn-light' disabled={isCorrect}>בדיקת הפתרון</button>
                    ) : (
                        <Tooltip text="טיפ: נוח יותר להקיש Enter לבדיקת הפתרון">
                            <button onClick={checkSolution} className='btn btn-light' disabled={isCorrect}>בדיקת הפתרון</button>
                        </Tooltip>
                    )
                }

                <div id="score">
                    תוצאה: &nbsp;
                    <span dir="ltr" style={{fontWeight: "bold"}}>
                        {calculatePoints(statisticsControls.numQuestionsCorrect, statisticsControls.numQuestionsIncorrect)}
                    </span>
                </div>
                
                {
                    isMobile() ? (
                        <button onClick={nextQuestion} className='btn btn-light'>{nextQuestionText}</button>        
                    ) : (
                        <Tooltip text="טיפ: אפשר גם להקיש Esc במקום">
                            <button onClick={nextQuestion} className='btn btn-light'>{nextQuestionText}</button>
                        </Tooltip>
                    )
                }
            </div>
            <Term question={question} isCorrect={isCorrect} isRevealed={isRevealed}
                  currentGuess={currentGuess} currentIndex={currentIndex}
                  bgColor={bgColor} handleCharClick={handleCharClick} showKeyboard={showKeyboard}/>
            <Description question={question} showFullDescription={isCorrect || isRevealed} showNewQuestion={nextQuestion}/>
        </div>
    );
}

function App(): JSX.Element {
    const [data, setData] = useState<RawQuestion[]>([]);
    const [question, setQuestion] = useState<ParsedQuestion | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [numQuestionsAsked, setNumQuestionsAsked] = useState<number>(0);
    const [numQuestionsCorrect, setNumQuestionsCorrect] = useState<number>(0);
    const [numQuestionsIncorrect, setNumQuestionsIncorrect] = useState<number>(0);
    const [bestNumQuestionsAsked, setBestNumQuestionsAsked] = useState<number>(0);
    const [bestNumQuestionsCorrect, setBestNumQuestionsCorrect] = useState<number>(0);
    const [bestNumQuestionsIncorrect, setBestNumQuestionsIncorrect] = useState<number>(0);
    const keyboardRef = useRef<HTMLDivElement>(null);

    const statisticsControls: StatisticsControls = {
        numQuestionsAsked,
        numQuestionsCorrect,
        setNumQuestionsCorrect,
        numQuestionsIncorrect,
        setNumQuestionsIncorrect,
        bestNumQuestionsAsked,
        bestNumQuestionsCorrect,
        bestNumQuestionsIncorrect
    };
    
    useEffect(() => {
        fetchData();

        const storedStatsRaw = localStorage.getItem('gameStats');
        if (storedStatsRaw) {
            const storedStats = JSON.parse(storedStatsRaw);
            if (storedStats) {
                setBestNumQuestionsAsked(storedStats.bestNumQuestionsAsked || 0);
                setBestNumQuestionsCorrect(storedStats.bestNumQuestionsCorrect || 0);
                setBestNumQuestionsIncorrect(storedStats.bestNumQuestionsIncorrect || 0);
            }
        }
    }, []);

    useEffect(() => {
        if (!isLoading && data.length > 0) {
            showNewQuestion();
        }
    }, [isLoading, data]);

    useEffect(()=> { 
        const currentPoints = calculatePoints(numQuestionsCorrect, numQuestionsIncorrect);
        const bestPoints = calculatePoints(bestNumQuestionsCorrect, bestNumQuestionsIncorrect);
        const currentNumQuestions = numQuestionsCorrect + numQuestionsIncorrect;
        const bestNumQuestions = bestNumQuestionsCorrect + bestNumQuestionsIncorrect;
        if ( (currentPoints > bestPoints) || ( (currentPoints == bestPoints) && (currentNumQuestions < bestNumQuestions)) )
        {
            setBestNumQuestionsAsked(numQuestionsAsked);
            setBestNumQuestionsCorrect(numQuestionsCorrect);
            setBestNumQuestionsIncorrect(numQuestionsIncorrect);
            const newGameStats = JSON.stringify({
                version: 1,
                bestNumQuestionsAsked: numQuestionsAsked,
                bestNumQuestionsCorrect: numQuestionsCorrect,
                bestNumQuestionsIncorrect: numQuestionsIncorrect,
            });
            localStorage.setItem('gameStats', newGameStats);
        }
    }, [numQuestionsCorrect, numQuestionsIncorrect]);
    
    const fetchData = async (): Promise<void> => {
        try {
            //await new Promise(resolve => setTimeout(resolve, 5000));
            const response = await fetch('top_articles.json');
            const jsonData: RawQuestion[] = await response.json();
            setData(prevData => {
                if (prevData.length != 0) {
                    // https://stackoverflow.com/questions/61254372/
                    setNumQuestionsAsked(0);
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
        const isDev = import.meta.env.MODE == "development";

        try {
            rawQuestion = data[randomIndex];

            if (isDev) {
                console.log(`Initial title: ${rawQuestion.title}`);
            }

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

            if (isDev) {
                console.log(`Selected title: ${title}`);
            }

            setQuestion(() => {
                return parsedQuestion
            });

            setNumQuestionsAsked(prev => prev + 1);
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
            setTimeout(function(){
                document.querySelectorAll('a').forEach(function(link) {
                    link.blur();
                });
            }, 1000);
        };
        
        document.body.addEventListener('click', handleClick);
        
        return () => {
            document.body.removeEventListener('click', handleClick);
        };
    }, []);

    const showKeyboard = () => {
        if (keyboardRef.current) {
            const bsOffcanvas = new Offcanvas(keyboardRef.current)
            bsOffcanvas.show();
        }
    }

    return (
        <>
            <Header/>
            <div className="App">
                <h1>מה הערך?</h1>
                <h2 id="subtitle">משחק ידע-כללי אינטראקטיבי</h2>
                {isLoading ? (
                    <div id="loader">
                        <div className="spinner-border" id="loader" role="status">
                            <span className="sr-only"></span>
                        </div>
                    </div>
                ) : (
                    <div>
                        {question && data.length > 0 && (
                            <Game question={question} showNewQuestion={skipQuestion} 
                                  statisticsControls={statisticsControls} showKeyboard={showKeyboard}/>
                        )}
                        {data.length == 0 && <div className='game_over'>זהו. זה נגמר. סיימתם הכל. נראה אתכם מחר?</div>}
                        <OnScreenKeyboard keyboardRef={keyboardRef}/>
                    </div>
                )}
            </div>
            <Statistics statisticsControls={statisticsControls}/>
            <Footer statisticsControls={statisticsControls}/>
        </>
    )
}

export default App;
