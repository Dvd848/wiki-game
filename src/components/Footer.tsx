import {StatisticsControls, calculatePoints} from "../App.tsx"

interface FooterProps {
    statisticsControls: StatisticsControls
}

const Footer = ({statisticsControls}: FooterProps) => {

    const score = calculatePoints(statisticsControls.bestNumQuestionsCorrect, statisticsControls.bestNumQuestionsIncorrect);
    return (
        <>
            <footer className="footer mt-auto bg-secondary-subtle fixed-bottom">
                <div>
                    <button className="btn btn-dark"
                            type="button" data-bs-toggle="offcanvas" 
                            data-bs-target="#onScreenKeyboardOffcanvas" aria-controls="onScreenKeyboardOffcanvas">מקלדת</button>
                </div>
                <div id="max_score">
                    {
                        
                            score > 0 ? (
                                <>
                                    <span>
                                        שיא אישי: {score}
                                    </span>
                                </>
                            ) : (
                                <span style={{fontSize: "0.7em"}}>אל תשאירו אותנו חסרי ערך...</span>
                            )
                        }
                </div>
            </footer>
        </>
    );
}

export default Footer;
