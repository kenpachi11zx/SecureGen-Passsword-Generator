from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict
import random
import string
import re
import uvicorn
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

# Security
SECRET_KEY = "your-secret-key-for-jwt"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

app = FastAPI(title="SecureGen API", description="Password generation and management API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class SymbolGroups(BaseModel):
    punctuation: bool = True
    brackets: bool = True
    math: bool = True
    special: bool = True
    other: bool = True

class PasswordRequest(BaseModel):
    length: int = Field(..., ge=4, le=100, description="Password length")
    uppercase: bool = Field(True, description="Include uppercase letters")
    lowercase: bool = Field(True, description="Include lowercase letters")
    numbers: bool = Field(True, description="Include numbers")
    symbols: bool = Field(True, description="Include symbols")
    symbolGroups: Optional[SymbolGroups] = None

class PasswordResponse(BaseModel):
    password: str
    strength: str
    score: int
    feedback: List[str]

class PasswordHistoryItem(BaseModel):
    password: str
    strength: str
    score: int
    timestamp: datetime
    settings: PasswordRequest

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class User(BaseModel):
    id: str
    email: EmailStr
    name: str
    disabled: bool = False

class UserInDB(User):
    hashed_password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Mock database
fake_users_db = {
    "user@example.com": {
        "id": "1",
        "email": "user@example.com",
        "name": "Test User",
        "hashed_password": pwd_context.hash("password"),
        "disabled": False,
        "password_history": []
    }
}

# Security functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def get_user(db, email: str):
    if email in db:
        user_dict = db[email]
        return UserInDB(**user_dict)
    return None

def authenticate_user(fake_db, email: str, password: str):
    user = get_user(fake_db, email)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except jwt.PyJWTError:
        raise credentials_exception
    user = get_user(fake_users_db, email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if current_user.disabled:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

# Password generation and analysis
def calculate_password_strength(password: str) -> dict:
    score = 0
    feedback = []
    
    # Base score from length
    if len(password) >= 16:
        score += 25
    elif len(password) >= 12:
        score += 20
    elif len(password) >= 8:
        score += 10
    else:
        score += 5
        feedback.append("Password is too short")
    
    # Character variety
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_number = bool(re.search(r'[0-9]', password))
    has_symbol = bool(re.search(r'[^A-Za-z0-9]', password))
    
    if has_upper:
        score += 10
    if has_lower:
        score += 10
    if has_number:
        score += 10
    if has_symbol:
        score += 15
    
    if not has_upper:
        feedback.append("Add uppercase letters")
    if not has_lower:
        feedback.append("Add lowercase letters")
    if not has_number:
        feedback.append("Add numbers")
    if not has_symbol:
        feedback.append("Add symbols")
    
    # Check for variety
    char_variety = sum([has_upper, has_lower, has_number, has_symbol])
    if char_variety < 3:
        feedback.append("Use more types of characters")
    
    # Check for patterns
    if re.search(r'(.)\1{2,}', password):
        score -= 10
        feedback.append("Avoid repeated characters")
    
    if re.match(r'^[A-Za-z]+$', password) or re.match(r'^[0-9]+$', password):
        score -= 15
        feedback.append("Mix character types")
    
    # Check for sequential characters
    if re.search(r'abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz', password, re.IGNORECASE):
        score -= 10
        feedback.append("Avoid sequential characters")
    
    if re.search(r'123|234|345|456|567|678|789|890', password):
        score -= 10
        feedback.append("Avoid sequential numbers")
    
    # Check for common passwords (simplified)
    common_passwords = ["password", "123456", "qwerty", "admin", "welcome"]
    if password.lower() in common_passwords:
        score = 0
        feedback = ["This is a commonly used password"]
    
    # Normalize score
    score = max(0, min(100, score))
    
    # Determine strength category
    if score >= 80:
        strength = "Very Strong"
    elif score >= 60:
        strength = "Strong"
    elif score >= 40:
        strength = "Medium"
    elif score >= 20:
        strength = "Weak"
    else:
        strength = "Very Weak"
    
    return {
        "score": score,
        "strength": strength,
        "feedback": feedback
    }

# Routes
@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(fake_users_db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/users", response_model=User)
async def create_user(user: UserCreate):
    if user.email in fake_users_db:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    user_id = str(len(fake_users_db) + 1)
    hashed_password = get_password_hash(user.password)
    
    fake_users_db[user.email] = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "hashed_password": hashed_password,
        "disabled": False,
        "password_history": []
    }
    
    return {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "disabled": False
    }

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.post("/generate", response_model=PasswordResponse)
async def generate_password(request: PasswordRequest, current_user: User = Depends(get_current_active_user)):
    # Validate that at least one character set is selected
    if not any([request.uppercase, request.lowercase, request.numbers, request.symbols]):
        raise HTTPException(status_code=400, detail="At least one character set must be selected")
    
    # Define character sets
    chars = ""
    if request.uppercase:
        chars += string.ascii_uppercase
    if request.lowercase:
        chars += string.ascii_lowercase
    if request.numbers:
        chars += string.digits
    
    # Handle symbols with specific groups
    if request.symbols:
        if request.symbolGroups:
            if request.symbolGroups.punctuation:
                chars += ".,;:"
            if request.symbolGroups.brackets:
                chars += "[]{}()<>"
            if request.symbolGroups.math:
                chars += "+-=_*"
            if request.symbolGroups.special:
                chars += "!@#$%^&"
            if request.symbolGroups.other:
                chars += "~`|\\/?\"\'"
        else:
            # If no specific groups are selected, use all symbols
            chars += string.punctuation
    
    # Generate password
    if not chars:
        raise HTTPException(status_code=400, detail="No character sets selected")
    
    password = ''.join(random.choice(chars) for _ in range(request.length))
    
    # Calculate password strength
    strength_result = calculate_password_strength(password)
    
    # Save to user's history
    if current_user.email in fake_users_db:
        history_item = PasswordHistoryItem(
            password=password,
            strength=strength_result["strength"],
            score=strength_result["score"],
            timestamp=datetime.utcnow(),
            settings=request
        )
        
        # Add to history and keep only the last 10 items
        fake_users_db[current_user.email]["password_history"].insert(0, history_item.dict())
        if len(fake_users_db[current_user.email]["password_history"]) > 10:
            fake_users_db[current_user.email]["password_history"].pop()
    
    return {
        "password": password,
        "strength": strength_result["strength"],
        "score": strength_result["score"],
        "feedback": strength_result["feedback"]
    }

@app.get("/history", response_model=List[PasswordHistoryItem])
async def get_password_history(current_user: User = Depends(get_current_active_user)):
    if current_user.email in fake_users_db:
        return fake_users_db[current_user.email]["password_history"]
    return []

@app.delete("/history/{index}")
async def delete_history_item(index: int, current_user: User = Depends(get_current_active_user)):
    if current_user.email in fake_users_db:
        history = fake_users_db[current_user.email]["password_history"]
        if 0 <= index < len(history):
            deleted_item = history.pop(index)
            return {"message": "History item deleted successfully"}
        raise HTTPException(status_code=404, detail="History item not found")
    raise HTTPException(status_code=404, detail="User not found")

@app.delete("/history")
async def clear_history(current_user: User = Depends(get_current_active_user)):
    if current_user.email in fake_users_db:
        fake_users_db[current_user.email]["password_history"] = []
        return {"message": "Password history cleared successfully"}
    raise HTTPException(status_code=404, detail="User not found")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
