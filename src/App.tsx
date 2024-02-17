import { useEffect, useState } from 'react'
import Header from './components/Header.tsx'
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
        text = text.replace(/\(([^())]*)\)/g, (match, group1) => ``);
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

    censoredText = censoredText.replace(/([a-zA-ZÀ-ÖØ-öø-ÿ]+)/g, (_, p1) => '█'.repeat(p1.length));

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

function removeAtIndex<T>(array: T[], index: number): T[] {
    if (index < 0 || index >= array.length) {
        throw new Error("Index out of bounds.");
    }
    
    return array.filter((_, idx) => idx !== index);
}

const useGame = (question: ParsedQuestion, showNewQuestion: () => void) => {
    const [currentGuess, setCurrentGuess] = useState<string[]>(Array.from({ length: question.solutionArray.length }, () => ''));
    const [isCorrect, setIsCorrect] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [bgColor, setBgColor] = useState('default');

    useEffect(()=> { 
        setCurrentIndex(() => 0);
        setCurrentGuess(() => Array.from({ length: question.solutionArray.length }, () => ''));
        setIsCorrect(() => false);
        setBgColor(() => 'default');
        if (question.solutionArray[0].is_const) {
            setCurrentIndex(() => moveForward(0));
        }
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
        if (currentGuess.join('') === question.solutionStripped) {
            setIsCorrect(true);
            setBgColor('green');
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

        const newGuess = [...currentGuess];
        newGuess[currentIndex] = newChar;
        setCurrentGuess(() => newGuess);
        setCurrentIndex(() => nextIndex);
    }

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

    // if (question.solutionArray[currentIndex].is_const) {
    //     setCurrentIndex(() => moveForward(currentIndex));
    // }
    
    return {currentGuess, currentIndex, isCorrect, bgColor, handleKeyup, handleCharClick, checkSolution}
}

function Game({ question, showNewQuestion }: { question: ParsedQuestion, showNewQuestion: () => void }) {
    const words = question.parsedTitle.split(/\s+/);

    const { currentGuess, currentIndex, isCorrect, bgColor, handleKeyup, handleCharClick, checkSolution } = useGame(question, showNewQuestion);

    useEffect(() => {
        window.addEventListener('keyup', handleKeyup)
        return () => window.removeEventListener('keyup', handleKeyup)
    }, [handleKeyup]);

    let currentGuessIndex = 0;
    const description = (isCorrect) ? question.description : question.censoredDescription;
    const wikiPage = "https://he.wikipedia.org/?curid=" + question.pageid;

    return (
        <div>
            <div className="term">
                {words.map((word, index) => (
                    <div key={index} className="word">
                        {word.split('').map((char, charIndex) => {
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
                <div id="reference">מקור: <a href={wikiPage} target="_BLANK">ויקיפדיה</a>, רשיון: <a href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA</a></div>
            </div>
            <div style={{textAlign: "center"}}>
                {!isCorrect && <button onClick={checkSolution} className='btn btn-dark'>בדיקת הפתרון</button>}
            </div>
        </div>
    );
}

function App(): JSX.Element {
    const [data, setData] = useState<RawQuestion[]>([]);
    const [question, setQuestion] = useState<ParsedQuestion | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    
    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (!isLoading && data.length > 0) {
            showNewQuestion();
        }
    }, [isLoading, data]);
    
    const fetchData = async (): Promise<void> => {
        try {
            //await new Promise(resolve => setTimeout(resolve, 5000));
            const response = await fetch('top_articles.json');
            const jsonData: RawQuestion[] = await response.json();
            setData(jsonData);
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

        const skipTerms = [
            "       " // Found in math articles which don't render correctly
        ]

        const randomIndex = Math.floor(Math.random() * data.length);

        try {
            rawQuestion = data[randomIndex];
            console.log(`Initial title: ${rawQuestion.title}`);

            if (rawQuestion.extract.length < MIN_DESC_LENGTH) {
                throw new Error(`Skipping ${rawQuestion.title} since description length is smaller than minimum`);
            }

            if (skipTerms.some(forbiddenStr => rawQuestion.extract.includes(forbiddenStr))) {
                throw new Error(`Skipping ${rawQuestion.title} since description contains forbidden term`);
            }

            if (/[a-zA-Z]/.test(rawQuestion.title)) {
                throw new Error(`Skipping ${rawQuestion.title} since title contains English`);
            }

            if (isAllDigits(rawQuestion.title)) {
                throw new Error(`Skipping ${rawQuestion.title} since description is fully composed of digits`);
            }

            const title = stripNiqqud(stripParentheses(rawQuestion.title));
            const description = stripNiqqud(stripParentheses(rawQuestion.extract)).replace(/ ,/g, ",").replace(/ \./g, ".").replace(/־/g, "-");
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
    
            const parsedQuestion : ParsedQuestion = {
                originalTitle: title,
                parsedTitle: parsedTitle,
                description: description,
                solutionArray: solutionArray,
                solutionStripped: solutionStripped,
                index: randomIndex,
                pageid: rawQuestion.pageid,
                censoredDescription: censorText(description, 
                                                [...stripNonLegalChars(titleWords), 
                                                 ...titleWords.filter(word => !isAllDigits(word))
                                                              .filter(str => !['-'].includes(str))]),
            }

            console.log(`Selected title: ${title}`);

            setQuestion(() => {
                return parsedQuestion
            });
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
                        {question && (
                            <Game question={question} showNewQuestion={skipQuestion}/>
                        )}
                        {data.length == 0 && <div className='game_over'>זהו. זה נגמר. סיימתם הכל. נראה אתכם מחר?</div>}
                        <div style={{textAlign: "center"}}>
                            {data.length > 0 && <button onClick={skipQuestion} className='btn btn-danger'>ערך אחר</button>}
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

export default App;
